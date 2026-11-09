-- ATLOS incremental integration: secure order path and signed postback processing.
-- Keep purchasing closed when this migration is applied; activation is a separate
-- deliberate action after sandbox, inventory, and fulfillment tests.
BEGIN;
UPDATE public.store_settings
SET checkout_enabled = FALSE
WHERE singleton = TRUE;

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_idempotency_key TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_type delivery_type,
  p_payment_method payment_method_type,
  p_payment_reference TEXT,
  p_payment_receipt_url TEXT,
  p_target_player_id TEXT,
  p_target_player_name TEXT,
  p_shipping_address JSONB,
  p_items JSONB -- Array of { product_id: UUID, quantity: INT, package_or_variant: TEXT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_existing_order public.orders%ROWTYPE;
  v_new_order public.orders%ROWTYPE;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_shipping_fee NUMERIC(10, 2) := 0.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_order_number TEXT;
  v_initial_status public.order_status;
  v_initial_payment_status public.payment_status;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_package JSONB;
  v_expired_order_id UUID;
  v_expired_item RECORD;
  v_item_qty INT;
  v_item_unit_price NUMERIC(10, 2);
  v_item_total NUMERIC(10, 2);
BEGIN
  -- 1. Verify caller session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'المصادقة مطلوبة: يجب تسجيل الدخول لإنشاء طلب.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.store_settings
    WHERE singleton = TRUE AND checkout_enabled = TRUE
  ) THEN
    RAISE EXCEPTION 'إتمام الشراء متوقف لحين ربط مخزون وتسليم رقمي موثوق؛ لا يتم إنشاء طلب أو قبول دفع.';
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'الملف الشخصي للمستخدم غير موجود.';
  END IF;

  -- 2. Idempotency Check
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 OR length(trim(p_idempotency_key)) > 128 THEN
    RAISE EXCEPTION 'مفتاح عدم التكرار يجب أن يكون بين 8 و128 محرفًا.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT || ':' || trim(p_idempotency_key), 0));

  SELECT * INTO v_existing_order FROM public.orders
  WHERE customer_id = v_user_id AND idempotency_key = trim(p_idempotency_key)
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_order.payment_method <> p_payment_method THEN
      RAISE EXCEPTION 'مفتاح عدم التكرار مستخدم بالفعل مع وسيلة دفع مختلفة.';
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'message', 'الطلب مسجل مسبقاً بنفس مفتاح عدم التكرار',
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'status', v_existing_order.status,
      'total_usd', v_existing_order.total_usd,
      'payment_status', v_existing_order.payment_status
    );
  END IF;

  -- ATLOS orders can be created only as pending; the checkout feature flag
  -- above remains the hard stop until stock and delivery are production-ready.
  IF p_payment_method NOT IN ('libyana', 'almadar', 'bank_transfer', 'payoneer', 'atlos_crypto') THEN
    RAISE EXCEPTION 'وسيلة الدفع غير مفعلة.';
  END IF;
  IF p_payment_method = 'atlos_crypto' THEN
    IF p_payment_reference IS NOT NULL THEN
      RAISE EXCEPTION 'لا تقبل مرجع دفع من المتصفح لوسيلة ATLOS.';
    END IF;
  ELSIF p_payment_reference IS NULL OR length(trim(p_payment_reference)) < 3 OR length(trim(p_payment_reference)) > 200 THEN
    RAISE EXCEPTION 'مرجع التحويل مطلوب ويجب ألا يتجاوز 200 محرف.';
  END IF;
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 OR length(trim(p_customer_name)) > 120 THEN
    RAISE EXCEPTION 'اسم العميل مطلوب ويجب ألا يتجاوز 120 محرفًا.';
  END IF;
  IF p_payment_receipt_url IS NOT NULL THEN
    RAISE EXCEPTION 'رفع إيصال الدفع غير متاح قبل إعداد تخزين خاص وآمن.';
  END IF;
  IF p_delivery_type = 'physical_shipment' THEN
    RAISE EXCEPTION 'الشراء والشحن الماديان متوقفان حتى احتساب عرض شحن حي من CJ.';
  END IF;

  -- 3. Validate items array
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'يجب أن يحتوي الطلب على عنصر واحد على الأقل.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS requested(item)
    GROUP BY requested.item->>'product_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'لا تكرر المنتج نفسه في أكثر من سطر واحد بالطلب.';
  END IF;

  -- Release stale stock reservations whenever a new order is created.
  FOR v_expired_order_id IN
    SELECT id FROM public.orders
    WHERE (
        (status = 'awaiting_manual_review'::order_status AND payment_status = 'under_review'::payment_status)
        OR (status = 'pending'::order_status AND payment_method = 'atlos_crypto'::payment_method_type AND payment_status = 'pending'::payment_status)
      )
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < NOW()
    FOR UPDATE
  LOOP
    FOR v_expired_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = v_expired_order_id
    LOOP
      UPDATE public.products
      SET stock_count = stock_count + v_expired_item.quantity, in_stock = true, updated_at = NOW()
      WHERE id = v_expired_item.product_id;
    END LOOP;
    UPDATE public.orders
    SET status = 'cancelled'::order_status,
        payment_status = 'rejected'::payment_status,
        admin_review_notes = 'انتهت مهلة حجز المخزون دون اعتماد الدفع.',
        reservation_expires_at = NULL,
        updated_at = NOW()
    WHERE id = v_expired_order_id;
  END LOOP;

  -- 4. Calculate prices strictly from products table
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::INT, 1);
    IF v_item_qty <= 0 OR v_item_qty > 10 THEN
      RAISE EXCEPTION 'الكمية يجب أن تكون بين 1 و10.';
    END IF;

    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'المنتج المطلوب غير موجود: %', (v_item->>'product_id');
    END IF;

    IF NOT v_product.in_stock THEN
      RAISE EXCEPTION 'المنتج غير متوفر حالياً بالمخزون: %', v_product.title_ar;
    END IF;

    IF v_product.product_type <> 'digital'::product_type OR v_product.delivery_type <> p_delivery_type THEN
      RAISE EXCEPTION 'نوع التسليم لا يطابق إعداد المنتج: %', v_product.title_ar;
    END IF;
    IF v_product.stock_count < v_item_qty THEN
      RAISE EXCEPTION 'الكمية المطلوبة غير متاحة بالمخزون: %', v_product.title_ar;
    END IF;

    v_item_unit_price := v_product.price_usd;
    IF v_item->>'package_or_variant' IS NOT NULL THEN
      IF jsonb_typeof(v_product.packages) <> 'array' OR jsonb_array_length(v_product.packages) = 0 THEN
        RAISE EXCEPTION 'خيارات المنتج غير مسجلة في قاعدة البيانات: %', v_product.title_ar;
      END IF;
      SELECT package_row INTO v_package
      FROM jsonb_array_elements(v_product.packages) AS packages(package_row)
      WHERE COALESCE(package_row->>'id', package_row->>'name', package_row->>'title') = v_item->>'package_or_variant'
      LIMIT 1;
      IF v_package IS NULL THEN
        RAISE EXCEPTION 'الباقة المطلوبة غير موجودة للمنتج: %', v_product.title_ar;
      END IF;
      v_item_unit_price := COALESCE(
        NULLIF(v_package->>'price_usd', '')::NUMERIC,
        NULLIF(v_package->>'priceUSD', '')::NUMERIC,
        NULLIF(v_package->>'price', '')::NUMERIC
      );
      IF v_item_unit_price IS NULL OR v_item_unit_price < 0 THEN
        RAISE EXCEPTION 'سعر الباقة غير صالح في قاعدة البيانات: %', v_product.title_ar;
      END IF;
    END IF;
    v_item_total := v_item_unit_price * v_item_qty;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 5. Shipping is zero for digital orders; physical delivery is rejected above
  -- until a live, server-verified CJ shipping quote is integrated.
  v_shipping_fee := 0.00;

  v_total := v_subtotal + v_shipping_fee;
  v_order_number := 'TRK-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));

  -- 6. Set initial status based on payment method
  IF p_payment_method IN ('libyana', 'almadar', 'bank_transfer', 'payoneer') THEN
    v_initial_status := 'awaiting_manual_review'::order_status;
    v_initial_payment_status := 'under_review'::payment_status;
  ELSE
    v_initial_status := 'pending'::order_status;
    v_initial_payment_status := 'pending'::payment_status;
  END IF;

  -- 7. Insert order atomically
  INSERT INTO public.orders (
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    subtotal_usd,
    shipping_fee_usd,
    total_usd,
    status,
    payment_status,
    payment_method,
    payment_reference,
    payment_receipt_url,
    reservation_expires_at,
    delivery_type,
    target_player_id,
    target_player_name,
    shipping_address,
    idempotency_key
  ) VALUES (
    v_order_number,
    v_user_id,
    COALESCE(p_customer_name, 'العميل'),
    v_user_email,
    p_customer_phone,
    v_subtotal,
    v_shipping_fee,
    v_total,
    v_initial_status,
    v_initial_payment_status,
    p_payment_method,
    p_payment_reference,
    p_payment_receipt_url,
    NOW() + INTERVAL '24 hours',
    p_delivery_type,
    p_target_player_id,
    p_target_player_name,
    p_shipping_address,
    p_idempotency_key
  )
  RETURNING * INTO v_new_order;

  -- 8. Insert order items atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::INT, 1);
    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::UUID;
    v_item_unit_price := v_product.price_usd;
    IF v_item->>'package_or_variant' IS NOT NULL THEN
      SELECT package_row INTO v_package
      FROM jsonb_array_elements(v_product.packages) AS packages(package_row)
      WHERE COALESCE(package_row->>'id', package_row->>'name', package_row->>'title') = v_item->>'package_or_variant'
      LIMIT 1;
      v_item_unit_price := COALESCE(
        NULLIF(v_package->>'price_usd', '')::NUMERIC,
        NULLIF(v_package->>'priceUSD', '')::NUMERIC,
        NULLIF(v_package->>'price', '')::NUMERIC
      );
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_title,
      package_or_variant,
      cj_sku,
      unit_price_usd,
      quantity,
      total_price_usd
    ) VALUES (
      v_new_order.id,
      v_product.id,
      v_product.title_ar,
      v_item->>'package_or_variant',
      v_product.cj_sku,
      v_item_unit_price,
      v_item_qty,
      v_item_unit_price * v_item_qty
    );

    UPDATE public.products
    SET stock_count = stock_count - v_item_qty,
        in_stock = (stock_count - v_item_qty) > 0,
        updated_at = NOW()
    WHERE id = v_product.id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', v_new_order.id,
    'order_number', v_new_order.order_number,
    'total_usd', v_new_order.total_usd,
    'status', v_new_order.status,
    'payment_status', v_new_order.payment_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_atlos_postback(
  p_transaction_id TEXT,
  p_order_id UUID,
  p_merchant_id TEXT,
  p_order_amount NUMERIC,
  p_order_currency TEXT,
  p_paid_amount NUMERIC,
  p_status INTEGER,
  p_sanitized_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_existing_event public.payment_events%ROWTYPE;
  v_event_key TEXT;
  v_conflict_key TEXT;
  v_reason TEXT;
  v_inserted INTEGER;
  v_payload JSONB;
  v_same_event BOOLEAN;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'ATLOS postback processing is service-role only.';
  END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 1 OR length(trim(p_transaction_id)) > 200
     OR p_order_id IS NULL OR p_merchant_id IS NULL OR length(trim(p_merchant_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid ATLOS postback identifiers.';
  END IF;

  v_event_key := 'atlos:' || trim(p_transaction_id);
  v_payload := COALESCE(p_sanitized_payload, '{}'::JSONB)
    || jsonb_build_object('verified_merchant_id', p_merchant_id);

  -- Claim the provider transaction id before touching order state. A second
  -- callback can only be acknowledged as a duplicate if its critical fields match.
  INSERT INTO public.payment_events (
    order_id, provider, provider_event_id, event_type, sanitized_payload,
    signature_valid, processed, error_message
  ) VALUES (
    (SELECT id FROM public.orders WHERE id = p_order_id),
    'atlos', v_event_key, 'payment.confirmed', v_payload, TRUE, FALSE, NULL
  ) ON CONFLICT (provider_event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT * INTO v_existing_event
    FROM public.payment_events
    WHERE provider_event_id = v_event_key
    FOR UPDATE;

    v_same_event := v_existing_event.provider = 'atlos'
      AND v_existing_event.signature_valid = TRUE
      AND v_existing_event.sanitized_payload->'transaction_id' IS NOT DISTINCT FROM v_payload->'transaction_id'
      AND v_existing_event.sanitized_payload->'order_id' IS NOT DISTINCT FROM v_payload->'order_id'
      AND v_existing_event.sanitized_payload->'merchant_id' IS NOT DISTINCT FROM v_payload->'merchant_id'
      AND v_existing_event.sanitized_payload->'verified_merchant_id' IS NOT DISTINCT FROM v_payload->'verified_merchant_id'
      AND v_existing_event.sanitized_payload->'order_amount' IS NOT DISTINCT FROM v_payload->'order_amount'
      AND v_existing_event.sanitized_payload->'order_currency' IS NOT DISTINCT FROM v_payload->'order_currency'
      AND v_existing_event.sanitized_payload->'paid_amount' IS NOT DISTINCT FROM v_payload->'paid_amount'
      AND v_existing_event.sanitized_payload->'status' IS NOT DISTINCT FROM v_payload->'status';

    IF v_same_event THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'duplicate', TRUE,
        'processed', v_existing_event.processed
      );
    END IF;

    v_conflict_key := 'atlos-conflict:' || md5(v_event_key || ':' || v_payload::TEXT);
    INSERT INTO public.payment_events (
      order_id, provider, provider_event_id, event_type, sanitized_payload,
      signature_valid, processed, error_message
    ) VALUES (
      (SELECT id FROM public.orders WHERE id = p_order_id),
      'atlos', v_conflict_key, 'payment.conflict', v_payload, TRUE, FALSE,
      'TransactionId موجود مسبقًا مع طلب أو بيانات دفع مختلفة.'
    ) ON CONFLICT (provider_event_id) DO NOTHING;

    RETURN jsonb_build_object('success', FALSE, 'processed', FALSE, 'reason', 'transaction_id_conflict');
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.payment_events
    SET error_message = 'لا يوجد طلب محلي مطابق لمعرّف OrderId.'
    WHERE provider_event_id = v_event_key;
    RETURN jsonb_build_object('success', FALSE, 'processed', FALSE, 'reason', 'order_not_found');
  END IF;

  IF v_order.payment_method <> 'atlos_crypto'::public.payment_method_type THEN
    v_reason := 'وسيلة الدفع في الطلب لا تطابق ATLOS.';
  ELSIF p_status IS DISTINCT FROM 100 THEN
    v_reason := 'حالة معاملة ATLOS ليست نجاحاً مؤكداً.';
  ELSIF COALESCE(p_order_currency, '') <> 'USD' THEN
    v_reason := 'عملة الطلب لا تطابق العملة المسجلة (USD).';
  ELSIF p_order_amount IS NULL OR p_paid_amount IS NULL
     OR round(p_order_amount, 2) <> round(v_order.total_usd, 2)
     OR round(p_paid_amount, 2) < round(v_order.total_usd, 2) THEN
    v_reason := 'قيمة الدفع أو المبلغ المسجل في ATLOS لا يطابق الطلب.';
  ELSIF v_order.status <> 'pending'::public.order_status
     OR v_order.payment_status <> 'pending'::public.payment_status THEN
    v_reason := 'الطلب ليس في حالة انتظار دفع قابلة للتأكيد.';
  ELSIF v_order.reservation_expires_at IS NOT NULL AND v_order.reservation_expires_at < NOW() THEN
    v_reason := 'انتهت مهلة حجز المخزون؛ يلزم فحص يدوي قبل أي تسليم.';
  END IF;

  IF v_reason IS NOT NULL THEN
    UPDATE public.payment_events
    SET order_id = v_order.id,
        error_message = v_reason
    WHERE provider_event_id = v_event_key;
    RETURN jsonb_build_object('success', FALSE, 'processed', FALSE, 'reason', v_reason);
  END IF;

  UPDATE public.orders
  SET status = 'processing'::public.order_status,
      payment_status = 'captured'::public.payment_status,
      payment_reference = trim(p_transaction_id),
      reservation_expires_at = NULL,
      updated_at = NOW()
  WHERE id = v_order.id;

  UPDATE public.payment_events
  SET processed = TRUE,
      processed_at = NOW(),
      error_message = NULL
  WHERE provider_event_id = v_event_key;

  RETURN jsonb_build_object(
    'success', TRUE,
    'processed', TRUE,
    'order_id', v_order.id,
    'order_number', v_order.order_number
  );
END;
$$;

-- Authenticated admins may review manual-payment orders. The database rechecks
-- the admin role and order state; client-side role flags are never trusted.
CREATE OR REPLACE FUNCTION public.review_manual_payment(
  p_order_id UUID,
  p_decision TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_notes TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول كمدير نظام لتنفيذ هذه العملية.';
  END IF;
  IF p_order_id IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'القرار أو معرّف الطلب غير صالح.';
  END IF;
  v_notes := NULLIF(pg_catalog.btrim(p_notes), '');
  IF v_notes IS NOT NULL AND pg_catalog.length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'ملاحظات المراجعة تتجاوز الحد المسموح.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;
  IF v_order.status <> 'awaiting_manual_review'::public.order_status
     OR v_order.payment_status <> 'under_review'::public.payment_status
     OR v_order.payment_method NOT IN ('libyana', 'almadar', 'bank_transfer', 'payoneer') THEN
    RAISE EXCEPTION 'هذا الطلب ليس دفعة يدوية صالحة للمراجعة أو سبق التعامل معه.';
  END IF;

  IF v_order.reservation_expires_at IS NOT NULL AND v_order.reservation_expires_at < pg_catalog.now() THEN
    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
      UPDATE public.products
      SET stock_count = stock_count + v_item.quantity,
          in_stock = TRUE,
          updated_at = pg_catalog.now()
      WHERE id = v_item.product_id;
    END LOOP;
    UPDATE public.orders
    SET status = 'cancelled'::public.order_status,
        payment_status = 'rejected'::public.payment_status,
        reviewed_by_admin_id = v_admin_id,
        reviewed_at = pg_catalog.now(),
        reservation_expires_at = NULL,
        admin_review_notes = 'انتهت مهلة حجز المخزون قبل اعتماد الدفع.',
        updated_at = pg_catalog.now()
    WHERE id = p_order_id;
    INSERT INTO public.admin_audit_logs (admin_id, action, target_order_id, details)
    VALUES (v_admin_id, 'expire_manual_payment', p_order_id,
      pg_catalog.jsonb_build_object('order_number', v_order.order_number));
    RETURN pg_catalog.jsonb_build_object(
      'success', FALSE,
      'status', 'cancelled',
      'message', 'انتهت مهلة الطلب وأعيد المخزون؛ لا يمكن اعتماد الدفع.'
    );
  END IF;

  IF p_decision = 'approve' THEN
    UPDATE public.orders
    SET status = 'processing'::public.order_status,
        payment_status = 'captured'::public.payment_status,
        reviewed_by_admin_id = v_admin_id,
        reviewed_at = pg_catalog.now(),
        reservation_expires_at = NULL,
        admin_review_notes = v_notes,
        updated_at = pg_catalog.now()
    WHERE id = p_order_id;
    INSERT INTO public.admin_audit_logs (admin_id, action, target_order_id, details)
    VALUES (v_admin_id, 'approve_manual_payment', p_order_id,
      pg_catalog.jsonb_build_object('order_number', v_order.order_number,
        'notes', v_notes, 'total_usd', v_order.total_usd));
    RETURN pg_catalog.jsonb_build_object(
      'success', TRUE, 'status', 'processing',
      'message', 'تم اعتماد الدفع وتأكيد الطلب بنجاح.'
    );
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
  LOOP
    UPDATE public.products
    SET stock_count = stock_count + v_item.quantity,
        in_stock = TRUE,
        updated_at = pg_catalog.now()
    WHERE id = v_item.product_id;
  END LOOP;
  UPDATE public.orders
  SET status = 'cancelled'::public.order_status,
      payment_status = 'rejected'::public.payment_status,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = pg_catalog.now(),
      reservation_expires_at = NULL,
      admin_review_notes = v_notes,
      updated_at = pg_catalog.now()
  WHERE id = p_order_id;
  INSERT INTO public.admin_audit_logs (admin_id, action, target_order_id, details)
  VALUES (v_admin_id, 'reject_manual_payment', p_order_id,
    pg_catalog.jsonb_build_object('order_number', v_order.order_number, 'notes', v_notes));
  RETURN pg_catalog.jsonb_build_object(
    'success', TRUE, 'status', 'cancelled',
    'message', 'تم رفض إشعار التحويل وإلغاء الطلب.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, delivery_type, payment_method_type, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, delivery_type, payment_method_type, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.process_atlos_postback(TEXT, UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_atlos_postback(TEXT, UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID, TEXT, TEXT) TO authenticated;
COMMIT;
