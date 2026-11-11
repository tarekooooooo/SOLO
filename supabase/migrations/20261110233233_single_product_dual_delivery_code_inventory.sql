-- 1. helper: does a package support the requested delivery type?
create or replace function private.delivery_supported(
  p_product_delivery public.delivery_type,
  p_package jsonb,
  p_requested public.delivery_type
) returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when p_package is not null and jsonb_typeof(p_package->'delivery_types') = 'array'
      then exists (
        select 1 from jsonb_array_elements_text(p_package->'delivery_types') as t(v)
        where t.v = p_requested::text
      )
    else p_product_delivery = p_requested
  end
$$;
revoke all on function private.delivery_supported(public.delivery_type, jsonb, public.delivery_type) from public, anon, authenticated;

-- 2. create_order_atomic: code inventory backs both instant_code and direct_id_recharge
create or replace function public.create_order_atomic(p_idempotency_key text, p_customer_name text, p_customer_phone text, p_delivery_type delivery_type, p_payment_method payment_method_type, p_payment_reference text, p_payment_receipt_url text, p_target_player_id text, p_target_player_name text, p_shipping_address jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_user_id UUID; v_user_email TEXT; v_existing_order public.orders%ROWTYPE; v_new_order public.orders%ROWTYPE;
  v_subtotal NUMERIC(10,2) := 0.00; v_shipping_fee NUMERIC(10,2) := 0.00; v_total NUMERIC(10,2) := 0.00;
  v_order_number TEXT; v_initial_status public.order_status; v_initial_payment_status public.payment_status;
  v_item JSONB; v_product public.products%ROWTYPE; v_package JSONB; v_expired_order_id UUID; v_expired_item RECORD;
  v_item_qty INT; v_item_unit_price NUMERIC(10,2); v_item_total NUMERIC(10,2);
  v_code_based BOOLEAN; v_available INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'المصادقة مطلوبة: يجب تسجيل الدخول لإنشاء طلب.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.store_settings WHERE singleton=TRUE AND checkout_enabled=TRUE) THEN
    RAISE EXCEPTION 'إتمام الشراء متوقف لحين ربط مخزون وتسليم رقمي موثوق؛ لا يتم إنشاء طلب أو قبول دفع.';
  END IF;
  SELECT email INTO v_user_email FROM public.profiles WHERE id=v_user_id;
  IF v_user_email IS NULL THEN RAISE EXCEPTION 'الملف الشخصي للمستخدم غير موجود.'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key))<8 OR length(trim(p_idempotency_key))>128 THEN
    RAISE EXCEPTION 'مفتاح عدم التكرار يجب أن يكون بين 8 و128 محرفًا.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT || ':' || trim(p_idempotency_key),0));
  SELECT * INTO v_existing_order FROM public.orders WHERE customer_id=v_user_id AND idempotency_key=trim(p_idempotency_key) FOR UPDATE;
  IF FOUND THEN
    IF v_existing_order.payment_method<>p_payment_method THEN RAISE EXCEPTION 'مفتاح عدم التكرار مستخدم بالفعل مع وسيلة دفع مختلفة.'; END IF;
    RETURN jsonb_build_object('success',TRUE,'is_duplicate',TRUE,'message','الطلب مسجل مسبقاً بنفس مفتاح عدم التكرار','order_id',v_existing_order.id,'order_number',v_existing_order.order_number,'status',v_existing_order.status,'total_usd',v_existing_order.total_usd,'payment_status',v_existing_order.payment_status);
  END IF;
  IF p_payment_method NOT IN ('libyana','almadar','bank_transfer','payoneer','atlos_crypto') THEN RAISE EXCEPTION 'وسيلة الدفع غير مفعلة.'; END IF;
  IF p_payment_method='atlos_crypto' THEN
    IF p_payment_reference IS NOT NULL THEN RAISE EXCEPTION 'لا تقبل مرجع دفع من المتصفح لوسيلة ATLOS.'; END IF;
  ELSIF p_payment_reference IS NULL OR length(trim(p_payment_reference))<3 OR length(trim(p_payment_reference))>200 THEN
    RAISE EXCEPTION 'مرجع التحويل مطلوب ويجب ألا يتجاوز 200 محرف.';
  END IF;
  IF p_customer_name IS NULL OR length(trim(p_customer_name))<2 OR length(trim(p_customer_name))>120 THEN RAISE EXCEPTION 'اسم العميل مطلوب ويجب ألا يتجاوز 120 محرفًا.'; END IF;
  IF p_payment_receipt_url IS NOT NULL THEN RAISE EXCEPTION 'رفع إيصال الدفع غير متاح قبل إعداد تخزين خاص وآمن.'; END IF;
  IF p_delivery_type='physical_shipment' THEN RAISE EXCEPTION 'الشراء والشحن الماديان متوقفان حتى احتساب عرض شحن حي من CJ.'; END IF;
  IF p_delivery_type='direct_id_recharge' THEN
    IF p_target_player_id IS NULL OR length(trim(p_target_player_id))<3 OR length(trim(p_target_player_id))>64 THEN
      RAISE EXCEPTION 'معرّف اللاعب (ID) مطلوب للشحن المباشر ويجب أن يكون بين 3 و64 محرفًا.';
    END IF;
  END IF;
  v_code_based := p_delivery_type IN ('instant_code'::public.delivery_type,'direct_id_recharge'::public.delivery_type);
  IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'يجب أن يحتوي الطلب على عنصر واحد على الأقل.'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) AS requested(item) GROUP BY requested.item->>'product_id' HAVING COUNT(*)>1) THEN RAISE EXCEPTION 'لا تكرر المنتج نفسه في أكثر من سطر واحد بالطلب.'; END IF;
  FOR v_expired_order_id IN
    SELECT id FROM public.orders
    WHERE ((status='awaiting_manual_review'::order_status AND payment_status='under_review'::payment_status)
       OR (status='pending'::order_status AND payment_method='atlos_crypto'::payment_method_type AND payment_status='pending'::payment_status))
      AND reservation_expires_at IS NOT NULL AND reservation_expires_at<NOW() FOR UPDATE
  LOOP
    FOR v_expired_item IN SELECT product_id,quantity FROM public.order_items WHERE order_id=v_expired_order_id LOOP
      UPDATE public.products SET stock_count=stock_count+v_expired_item.quantity,in_stock=TRUE,updated_at=NOW() WHERE id=v_expired_item.product_id;
    END LOOP;
    UPDATE public.orders SET status='cancelled'::order_status,payment_status='rejected'::payment_status,
      admin_review_notes='انتهت مهلة حجز المخزون دون اعتماد الدفع.',reservation_expires_at=NULL,updated_at=NOW()
    WHERE id=v_expired_order_id;
  END LOOP;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_package := NULL;
    v_item_qty:=COALESCE((v_item->>'quantity')::INT,1);
    IF v_item_qty<=0 OR v_item_qty>10 THEN RAISE EXCEPTION 'الكمية يجب أن تكون بين 1 و10.'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::UUID FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'المنتج المطلوب غير موجود: %',(v_item->>'product_id'); END IF;
    IF NOT v_product.in_stock THEN RAISE EXCEPTION 'المنتج غير متوفر حالياً بالمخزون: %',v_product.title_ar; END IF;
    IF v_product.product_type<>'digital'::product_type THEN RAISE EXCEPTION 'نوع التسليم لا يطابق إعداد المنتج: %',v_product.title_ar; END IF;
    IF v_code_based AND (v_item->>'package_or_variant') IS NULL THEN RAISE EXCEPTION 'يجب اختيار الباقة: %',v_product.title_ar; END IF;
    v_item_unit_price:=v_product.price_usd;
    IF v_item->>'package_or_variant' IS NOT NULL THEN
      IF jsonb_typeof(v_product.packages)<>'array' OR jsonb_array_length(v_product.packages)=0 THEN RAISE EXCEPTION 'خيارات المنتج غير مسجلة في قاعدة البيانات: %',v_product.title_ar; END IF;
      SELECT package_row INTO v_package FROM jsonb_array_elements(v_product.packages) AS packages(package_row)
      WHERE COALESCE(package_row->>'id',package_row->>'name',package_row->>'title')=v_item->>'package_or_variant' LIMIT 1;
      IF v_package IS NULL THEN RAISE EXCEPTION 'الباقة المطلوبة غير موجودة للمنتج: %',v_product.title_ar; END IF;
      v_item_unit_price:=COALESCE(NULLIF(v_package->>'price_usd','')::NUMERIC,NULLIF(v_package->>'priceUSD','')::NUMERIC,NULLIF(v_package->>'price','')::NUMERIC);
      IF v_item_unit_price IS NULL OR v_item_unit_price<0 THEN RAISE EXCEPTION 'سعر الباقة غير صالح في قاعدة البيانات: %',v_product.title_ar; END IF;
    END IF;
    IF NOT private.delivery_supported(v_product.delivery_type, v_package, p_delivery_type) THEN
      RAISE EXCEPTION 'نوع التسليم لا يطابق إعداد المنتج: %',v_product.title_ar;
    END IF;
    IF v_code_based THEN
      SELECT COUNT(*)::INT INTO v_available FROM public.inventory
      WHERE product_id=v_product.id AND package_id=(v_item->>'package_or_variant') AND is_used=FALSE AND order_id IS NULL;
      IF v_available<v_item_qty THEN RAISE EXCEPTION 'الكمية المطلوبة غير متاحة لهذه الباقة حالياً: %',v_product.title_ar; END IF;
    ELSIF v_product.stock_count<v_item_qty THEN
      RAISE EXCEPTION 'الكمية المطلوبة غير متاحة بالمخزون: %',v_product.title_ar;
    END IF;
    v_item_total:=v_item_unit_price*v_item_qty; v_subtotal:=v_subtotal+v_item_total;
  END LOOP;
  v_shipping_fee:=0.00; v_total:=v_subtotal+v_shipping_fee;
  v_order_number:='TRK-'||to_char(NOW(),'YYYYMMDD')||'-'||upper(substring(md5(random()::TEXT) from 1 for 4));
  IF p_payment_method IN ('libyana','almadar','bank_transfer','payoneer') THEN
    v_initial_status:='awaiting_manual_review'::order_status; v_initial_payment_status:='under_review'::payment_status;
  ELSE v_initial_status:='pending'::order_status; v_initial_payment_status:='pending'::payment_status; END IF;
  INSERT INTO public.orders(order_number,customer_id,customer_name,customer_email,customer_phone,subtotal_usd,shipping_fee_usd,total_usd,status,payment_status,payment_method,payment_reference,payment_receipt_url,reservation_expires_at,delivery_type,target_player_id,target_player_name,shipping_address,idempotency_key)
  VALUES(v_order_number,v_user_id,COALESCE(p_customer_name,'العميل'),v_user_email,p_customer_phone,v_subtotal,v_shipping_fee,v_total,v_initial_status,v_initial_payment_status,p_payment_method,p_payment_reference,p_payment_receipt_url,NOW()+INTERVAL '24 hours',p_delivery_type,p_target_player_id,p_target_player_name,p_shipping_address,p_idempotency_key)
  RETURNING * INTO v_new_order;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_qty:=COALESCE((v_item->>'quantity')::INT,1);
    SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::UUID;
    v_item_unit_price:=v_product.price_usd;
    IF v_item->>'package_or_variant' IS NOT NULL THEN
      SELECT package_row INTO v_package FROM jsonb_array_elements(v_product.packages) AS packages(package_row)
      WHERE COALESCE(package_row->>'id',package_row->>'name',package_row->>'title')=v_item->>'package_or_variant' LIMIT 1;
      v_item_unit_price:=COALESCE(NULLIF(v_package->>'price_usd','')::NUMERIC,NULLIF(v_package->>'priceUSD','')::NUMERIC,NULLIF(v_package->>'price','')::NUMERIC);
    END IF;
    INSERT INTO public.order_items(order_id,product_id,product_title,package_or_variant,cj_sku,unit_price_usd,quantity,total_price_usd)
    VALUES(v_new_order.id,v_product.id,v_product.title_ar,v_item->>'package_or_variant',v_product.cj_sku,v_item_unit_price,v_item_qty,v_item_unit_price*v_item_qty);
    UPDATE public.products SET stock_count=greatest(stock_count-v_item_qty,0),in_stock=(stock_count-v_item_qty)>0,updated_at=NOW() WHERE id=v_product.id;
  END LOOP;
  RETURN jsonb_build_object('success',TRUE,'is_duplicate',FALSE,'order_id',v_new_order.id,'order_number',v_new_order.order_number,'total_usd',v_new_order.total_usd,'status',v_new_order.status,'payment_status',v_new_order.payment_status);
END; $function$;

-- 3. code reservation trigger: both delivery types reserve a code from the package inventory
create or replace function public.reserve_codes_after_order_item_insert()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
DECLARE
  v_order_delivery public.delivery_type;
  v_product_delivery public.delivery_type;
  v_packages JSONB;
  v_package JSONB;
  v_reserved INTEGER;
BEGIN
  SELECT order_row.delivery_type, product_row.delivery_type, product_row.packages
    INTO v_order_delivery, v_product_delivery, v_packages
  FROM public.orders AS order_row
  JOIN public.products AS product_row ON product_row.id = NEW.product_id
  WHERE order_row.id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_or_product_not_found';
  END IF;

  IF v_order_delivery IN ('instant_code'::public.delivery_type, 'direct_id_recharge'::public.delivery_type) THEN
    IF NEW.package_or_variant IS NULL OR NEW.quantity < 1 THEN
      RAISE EXCEPTION 'invalid_code_reservation_request';
    END IF;

    SELECT package_row INTO v_package
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_packages) = 'array' THEN v_packages ELSE '[]'::jsonb END) AS packages(package_row)
    WHERE COALESCE(package_row->>'id', package_row->>'name', package_row->>'title') = NEW.package_or_variant
    LIMIT 1;

    IF NOT private.delivery_supported(v_product_delivery, v_package, v_order_delivery) THEN
      RAISE EXCEPTION 'invalid_code_reservation_request';
    END IF;

    WITH candidates AS (
      SELECT inventory_row.id
      FROM public.inventory AS inventory_row
      WHERE inventory_row.product_id = NEW.product_id
        AND inventory_row.package_id = NEW.package_or_variant
        AND inventory_row.is_used = FALSE
        AND inventory_row.order_id IS NULL
      ORDER BY inventory_row.id
      FOR UPDATE SKIP LOCKED
      LIMIT NEW.quantity
    )
    UPDATE public.inventory AS inventory_row
    SET order_id = NEW.order_id,
        allocated_at = NOW()
    FROM candidates
    WHERE inventory_row.id = candidates.id;
    GET DIAGNOSTICS v_reserved = ROW_COUNT;

    IF v_reserved <> NEW.quantity THEN
      RAISE EXCEPTION 'insufficient_reserved_codes_for_package';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. admin_import_inventory: allow packages that support code-backed delivery
create or replace function public.admin_import_inventory(p_admin_user_id uuid, p_product_id uuid, p_package_id text, p_codes text[])
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
DECLARE
  v_delivery_type public.delivery_type;
  v_packages JSONB;
  v_package JSONB;
  v_inserted INTEGER;
  v_available BIGINT;
BEGIN
  IF p_admin_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_user_id AND role::TEXT = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF p_product_id IS NULL OR p_package_id IS NULL
     OR length(btrim(p_package_id)) = 0 OR length(p_package_id) > 100 THEN
    RAISE EXCEPTION 'invalid_product_or_package';
  END IF;
  IF p_codes IS NULL OR cardinality(p_codes) < 1 OR cardinality(p_codes) > 500 THEN
    RAISE EXCEPTION 'invalid_code_count';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_codes) AS submitted(code)
    WHERE submitted.code IS NULL
       OR length(btrim(submitted.code)) = 0
       OR length(btrim(submitted.code)) > 200
       OR position(E'\n' IN submitted.code) > 0
       OR position(E'\r' IN submitted.code) > 0
  ) THEN
    RAISE EXCEPTION 'invalid_code_value';
  END IF;
  IF EXISTS (
    SELECT btrim(submitted.code)
    FROM unnest(p_codes) AS submitted(code)
    GROUP BY btrim(submitted.code)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_code_in_batch';
  END IF;

  SELECT product.delivery_type, product.packages
    INTO v_delivery_type, v_packages
  FROM public.products AS product
  WHERE product.id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'instant_code_product_required';
  END IF;
  IF jsonb_typeof(v_packages) <> 'array' THEN
    RAISE EXCEPTION 'package_not_found';
  END IF;
  SELECT package.value INTO v_package
  FROM jsonb_array_elements(v_packages) AS package(value)
  WHERE COALESCE(package.value->>'id', package.value->>'package_id') = btrim(p_package_id)
  LIMIT 1;
  IF v_package IS NULL THEN
    RAISE EXCEPTION 'package_not_found';
  END IF;
  IF NOT (
    private.delivery_supported(v_delivery_type, v_package, 'instant_code'::public.delivery_type)
    OR private.delivery_supported(v_delivery_type, v_package, 'direct_id_recharge'::public.delivery_type)
  ) THEN
    RAISE EXCEPTION 'instant_code_product_required';
  END IF;

  INSERT INTO public.inventory (product_id, package_id, code_value)
  SELECT p_product_id, btrim(p_package_id), btrim(submitted.code)
  FROM unnest(p_codes) AS submitted(code);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  SELECT COUNT(*) INTO v_available
  FROM public.inventory
  WHERE product_id = p_product_id AND is_used = FALSE AND order_id IS NULL;
  UPDATE public.products
  SET stock_count = v_available::INTEGER, updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', TRUE, 'inserted_count', v_inserted, 'available_count', v_available);
END;
$function$;

-- 5. admin_fulfill_order: direct_id_recharge burns the reserved code (never shown to the customer)
create or replace function public.admin_fulfill_order(p_admin_user_id uuid, p_order_id uuid, p_notes text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_codes TEXT;
  v_item_code_count INTEGER;
  v_delivered_code_count INTEGER := 0;
  v_redeemed_code_count INTEGER := 0;
  v_notes TEXT;
BEGIN
  IF p_admin_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_user_id AND role::TEXT = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_id_required';
  END IF;

  v_notes := NULLIF(btrim(p_notes), '');
  IF v_notes IS NOT NULL AND length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'fulfillment_notes_too_long';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF v_order.payment_status <> 'captured'::public.payment_status THEN
    RAISE EXCEPTION 'payment_not_captured';
  END IF;
  IF v_order.status = 'completed'::public.order_status THEN
    RETURN jsonb_build_object('success', TRUE, 'status', 'completed', 'already_completed', TRUE);
  END IF;
  IF v_order.status <> 'processing'::public.order_status THEN
    RAISE EXCEPTION 'order_not_ready_for_fulfillment';
  END IF;

  IF v_order.delivery_type = 'instant_code'::public.delivery_type THEN
    FOR v_item IN
      SELECT item.id, item.product_id, item.package_or_variant, item.quantity, item.delivered_code
      FROM public.order_items AS item
      WHERE item.order_id = p_order_id
      ORDER BY item.id
      FOR UPDATE
    LOOP
      IF v_item.product_id IS NULL
         OR v_item.package_or_variant IS NULL
         OR v_item.delivered_code IS NOT NULL THEN
        RAISE EXCEPTION 'invalid_order_item_for_code_fulfillment';
      END IF;

      PERFORM 1
      FROM public.inventory AS inventory_row
      WHERE inventory_row.order_id = p_order_id
        AND inventory_row.product_id = v_item.product_id
        AND inventory_row.package_id = v_item.package_or_variant
        AND inventory_row.is_used = FALSE
      FOR UPDATE;

      SELECT COUNT(*)::INTEGER,
             string_agg(inventory_row.code_value, E'\n' ORDER BY inventory_row.id)
        INTO v_item_code_count, v_codes
      FROM public.inventory AS inventory_row
      WHERE inventory_row.order_id = p_order_id
        AND inventory_row.product_id = v_item.product_id
        AND inventory_row.package_id = v_item.package_or_variant
        AND inventory_row.is_used = FALSE;

      IF v_item_code_count <> v_item.quantity OR v_codes IS NULL THEN
        RAISE EXCEPTION 'reserved_code_count_mismatch';
      END IF;

      UPDATE public.inventory
      SET is_used = TRUE,
          allocated_at = NOW()
      WHERE order_id = p_order_id
        AND product_id = v_item.product_id
        AND package_id = v_item.package_or_variant
        AND is_used = FALSE;

      UPDATE public.order_items
      SET delivered_code = v_codes
      WHERE id = v_item.id;

      v_delivered_code_count := v_delivered_code_count + v_item_code_count;
    END LOOP;

    IF v_delivered_code_count = 0 THEN
      RAISE EXCEPTION 'no_reserved_codes_for_order';
    END IF;
    UPDATE public.orders
    SET status = 'completed'::public.order_status,
        fulfillment_notes = v_notes,
        updated_at = NOW()
    WHERE id = p_order_id;
  ELSIF v_order.delivery_type = 'direct_id_recharge'::public.delivery_type THEN
    IF v_notes IS NULL OR length(v_notes) < 3 THEN
      RAISE EXCEPTION 'manual_fulfillment_note_required';
    END IF;
    IF v_order.target_player_id IS NULL OR length(btrim(v_order.target_player_id)) < 3 THEN
      RAISE EXCEPTION 'target_player_id_required';
    END IF;
    FOR v_item IN
      SELECT item.id, item.product_id, item.package_or_variant, item.quantity
      FROM public.order_items AS item
      WHERE item.order_id = p_order_id
      ORDER BY item.id
      FOR UPDATE
    LOOP
      IF v_item.product_id IS NULL OR v_item.package_or_variant IS NULL THEN
        RAISE EXCEPTION 'invalid_order_item_for_code_fulfillment';
      END IF;

      PERFORM 1
      FROM public.inventory AS inventory_row
      WHERE inventory_row.order_id = p_order_id
        AND inventory_row.product_id = v_item.product_id
        AND inventory_row.package_id = v_item.package_or_variant
        AND inventory_row.is_used = FALSE
      FOR UPDATE;

      SELECT COUNT(*)::INTEGER INTO v_item_code_count
      FROM public.inventory AS inventory_row
      WHERE inventory_row.order_id = p_order_id
        AND inventory_row.product_id = v_item.product_id
        AND inventory_row.package_id = v_item.package_or_variant
        AND inventory_row.is_used = FALSE;

      IF v_item_code_count <> v_item.quantity THEN
        RAISE EXCEPTION 'reserved_code_count_mismatch';
      END IF;

      UPDATE public.inventory
      SET is_used = TRUE,
          allocated_at = NOW()
      WHERE order_id = p_order_id
        AND product_id = v_item.product_id
        AND package_id = v_item.package_or_variant
        AND is_used = FALSE;

      v_redeemed_code_count := v_redeemed_code_count + v_item_code_count;
    END LOOP;

    IF v_redeemed_code_count = 0 THEN
      RAISE EXCEPTION 'no_reserved_codes_for_order';
    END IF;
    UPDATE public.orders
    SET status = 'completed'::public.order_status,
        fulfillment_notes = v_notes,
        updated_at = NOW()
    WHERE id = p_order_id;
  ELSIF v_order.delivery_type = 'manual_service'::public.delivery_type THEN
    IF v_notes IS NULL OR length(v_notes) < 3 THEN
      RAISE EXCEPTION 'manual_fulfillment_note_required';
    END IF;
    UPDATE public.orders
    SET status = 'completed'::public.order_status,
        fulfillment_notes = v_notes,
        updated_at = NOW()
    WHERE id = p_order_id;
  ELSE
    RAISE EXCEPTION 'unsupported_delivery_type';
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_order_id, details)
  VALUES (
    p_admin_user_id,
    'fulfill_paid_order',
    p_order_id,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'delivery_type', v_order.delivery_type,
      'delivered_code_count', v_delivered_code_count,
      'redeemed_code_count', v_redeemed_code_count
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'completed',
    'delivered_code_count', v_delivered_code_count,
    'redeemed_code_count', v_redeemed_code_count
  );
END;
$function$;

-- 6. per-package availability for the storefront (counts only, capped at 10)
create or replace function public.get_package_availability(p_product_id uuid)
returns table (package_id text, available integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pkg.pid as package_id,
         least(coalesce(cnt.n, 0), 10)::integer as available
  from (
    select coalesce(e.value->>'id', e.value->>'package_id', e.value->>'name', e.value->>'title') as pid
    from public.products as p,
         jsonb_array_elements(case when jsonb_typeof(p.packages) = 'array' then p.packages else '[]'::jsonb end) as e(value)
    where p.id = p_product_id and p.in_stock
  ) as pkg
  left join (
    select i.package_id as pid, count(*) as n
    from public.inventory as i
    where i.product_id = p_product_id and i.is_used = false and i.order_id is null
    group by i.package_id
  ) as cnt on cnt.pid = pkg.pid
$$;
revoke all on function public.get_package_availability(uuid) from public;
grant execute on function public.get_package_availability(uuid) to anon, authenticated;

-- 7. the PUBG product: one product, two delivery options per package, visible in the store
update public.products
set delivery_type = 'instant_code',
    stock_count = 0,
    in_stock = true,
    description = 'اختر الباقة ثم اختر شحنًا فوريًا لحسابك (أدخل ID اللاعب) أو استلام الكود.',
    packages = (
      select jsonb_agg((t.elem - 'stock') || '{"delivery_types":["instant_code","direct_id_recharge"]}'::jsonb order by t.ord)
      from jsonb_array_elements(packages) with ordinality as t(elem, ord)
    ),
    updated_at = now()
where slug = 'pubg-mobile-global-uc';