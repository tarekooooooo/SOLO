-- Paymento crypto gateway for digital orders only.
-- Prepared for review only: do not apply to the live database or enable checkout
-- until the owner reviews this migration and configures Paymento server secrets.
BEGIN;

-- Independent opt-in for Paymento; existing checkout and ATLOS settings remain unchanged.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS paymento_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Paymento-specific amendment based on the current main order function.
-- It preserves main's product-level stock_count model and server-side package
-- pricing. It does not add PR #2 package-inventory reservations or dual delivery.
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

  -- Crypto gateway orders remain pending until a verified provider callback.
  -- The checkout feature flag above remains the hard stop until release approval.
  IF p_payment_method NOT IN ('libyana', 'almadar', 'bank_transfer', 'payoneer', 'atlos_crypto', 'paymento_crypto') THEN
    RAISE EXCEPTION 'وسيلة الدفع غير مفعلة.';
  END IF;
  IF p_payment_method = 'paymento_crypto' AND NOT EXISTS (
    SELECT 1 FROM public.store_settings
    WHERE singleton = TRUE AND checkout_enabled = TRUE AND paymento_enabled = TRUE
  ) THEN
    RAISE EXCEPTION 'بوابة Paymento غير مفعلة على الخادم.';
  END IF;
  IF p_payment_method IN ('atlos_crypto', 'paymento_crypto') THEN
    IF p_payment_reference IS NOT NULL THEN
      RAISE EXCEPTION 'لا تقبل مرجع دفع من المتصفح لبوابة العملات الرقمية.';
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
        OR (status = 'pending'::order_status AND payment_method IN ('atlos_crypto'::payment_method_type, 'paymento_crypto'::payment_method_type) AND payment_status = 'pending'::payment_status)
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

-- Keep one active Paymento session per local order. The opaque token is stored
-- only in this service-role-only table so retries reuse the same checkout link.
CREATE TABLE IF NOT EXISTS public.paymento_payment_sessions (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_token TEXT,
  token_hash TEXT UNIQUE CHECK (token_hash IS NULL OR token_hash ~ '^[0-9a-f]{64}$'),
  return_url TEXT NOT NULL CHECK (return_url LIKE 'https://%' AND length(return_url) <= 2048),
  state TEXT NOT NULL DEFAULT 'creating' CHECK (state IN ('creating', 'active', 'completed', 'needs_review')),
  expires_at TIMESTAMPTZ NOT NULL,
  lease_id UUID,
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((payment_token IS NULL AND token_hash IS NULL) OR (payment_token IS NOT NULL AND token_hash IS NOT NULL)),
  CHECK (state NOT IN ('active', 'completed') OR (payment_token IS NOT NULL AND token_hash IS NOT NULL))
);
ALTER TABLE public.paymento_payment_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.paymento_payment_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.paymento_payment_sessions TO service_role;

-- A minimal, non-sensitive request record links the provider token hash to its
-- local order. Raw tokens are never copied into the callback queue or audit log.
CREATE TABLE IF NOT EXISTS public.paymento_ipn_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_event_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id TEXT NOT NULL,
  token_hash TEXT NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  reported_status INTEGER NOT NULL,
  callback_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'completed', 'needs_review')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_id UUID,
  lease_expires_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_paymento_ipn_queue_due
  ON public.paymento_ipn_queue(state, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_paymento_ipn_queue_token
  ON public.paymento_ipn_queue(token_hash, created_at);
ALTER TABLE public.paymento_ipn_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.paymento_ipn_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.paymento_ipn_queue TO service_role;

-- A leased per-token lock prevents concurrent Verify calls for callbacks of the
-- same Paymento token. Expired leases are recoverable after a worker crash.
CREATE TABLE IF NOT EXISTS public.paymento_ipn_token_locks (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  lease_id UUID NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.paymento_ipn_token_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.paymento_ipn_token_locks FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.paymento_ipn_token_locks TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_paymento_payment_session(
  p_order_id UUID,
  p_return_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_session public.paymento_payment_sessions%ROWTYPE;
  v_lease_id UUID;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Paymento session reservation is service-role only.';
  END IF;
  IF p_order_id IS NULL OR p_return_url IS NULL OR length(p_return_url) > 2048
     OR p_return_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/|$)' THEN
    RAISE EXCEPTION 'Invalid Paymento session reservation parameters.';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND
     OR v_order.payment_method <> 'paymento_crypto'::public.payment_method_type
     OR v_order.status <> 'pending'::public.order_status
     OR v_order.payment_status <> 'pending'::public.payment_status
     OR v_order.reservation_expires_at IS NULL
     OR v_order.reservation_expires_at <= NOW()
     OR NOT EXISTS (
       SELECT 1 FROM public.store_settings
       WHERE singleton = TRUE AND checkout_enabled = TRUE AND paymento_enabled = TRUE
     ) THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'order_not_payable');
  END IF;

  SELECT * INTO v_session FROM public.paymento_payment_sessions
  WHERE order_id = p_order_id FOR UPDATE;
  IF FOUND THEN
    IF v_session.state = 'active' AND v_session.expires_at > NOW()
       AND v_session.payment_token IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', TRUE, 'action', 'reuse', 'payment_token', v_session.payment_token,
        'token_hash', v_session.token_hash, 'return_url', v_session.return_url,
        'expires_at', v_session.expires_at
      );
    END IF;
    IF v_session.state IN ('completed', 'needs_review') OR v_session.expires_at <= NOW() THEN
      RETURN jsonb_build_object('success', FALSE, 'reason', 'session_not_reusable');
    END IF;
    IF v_session.lease_id IS NOT NULL AND v_session.lease_expires_at > NOW() THEN
      RETURN jsonb_build_object('success', TRUE, 'action', 'in_progress');
    END IF;
    -- A prior provider request may have succeeded even if its response was lost.
    -- Never issue a second request for this order without manual reconciliation.
    UPDATE public.paymento_payment_sessions
    SET state = 'needs_review',
        lease_id = NULL,
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE order_id = p_order_id;
    RETURN jsonb_build_object('success', FALSE, 'reason', 'ambiguous_provider_request');
  END IF;

  v_lease_id := uuid_generate_v4();
  INSERT INTO public.paymento_payment_sessions (
    order_id, return_url, state, expires_at, lease_id, lease_expires_at
  ) VALUES (
    p_order_id, p_return_url, 'creating', v_order.reservation_expires_at,
    v_lease_id, NOW() + INTERVAL '2 minutes'
  );
  RETURN jsonb_build_object(
    'success', TRUE, 'action', 'create', 'lease_id', v_lease_id,
    'return_url', p_return_url, 'expires_at', v_order.reservation_expires_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_paymento_payment_session_needs_review(
  p_order_id UUID,
  p_lease_id UUID,
  p_payment_token TEXT DEFAULT NULL,
  p_token_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_rows INTEGER;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Paymento session review is service-role only.';
  END IF;
  IF (p_payment_token IS NULL) <> (p_token_hash IS NULL)
     OR (p_payment_token IS NOT NULL AND (length(p_payment_token) < 16 OR length(p_payment_token) > 200))
     OR (p_token_hash IS NOT NULL AND p_token_hash !~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'Invalid Paymento session review parameters.';
  END IF;
  UPDATE public.paymento_payment_sessions
  SET state = 'needs_review',
      payment_token = COALESCE(p_payment_token, payment_token),
      token_hash = COALESCE(p_token_hash, token_hash),
      lease_id = NULL,
      lease_expires_at = NULL,
      updated_at = NOW()
  WHERE order_id = p_order_id AND state = 'creating' AND lease_id = p_lease_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN jsonb_build_object('success', v_rows = 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_paymento_payment_request(
  p_order_id UUID,
  p_payment_token TEXT,
  p_token_hash TEXT,
  p_lease_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_session public.paymento_payment_sessions%ROWTYPE;
  v_event public.payment_events%ROWTYPE;
  v_event_key TEXT;
  v_inserted INTEGER;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Paymento request registration is service-role only.';
  END IF;
  IF p_order_id IS NULL OR p_payment_token IS NULL OR length(p_payment_token) < 16 OR length(p_payment_token) > 200
     OR p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_lease_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Paymento request identifiers.';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  SELECT * INTO v_session FROM public.paymento_payment_sessions
  WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_session.state <> 'creating' OR v_session.lease_id IS DISTINCT FROM p_lease_id
     OR v_session.expires_at <= NOW()
     OR v_order.reservation_expires_at IS NULL OR v_order.reservation_expires_at <= NOW()
     OR v_order.payment_method <> 'paymento_crypto'::public.payment_method_type
     OR v_order.status <> 'pending'::public.order_status
     OR v_order.payment_status <> 'pending'::public.payment_status
     OR NOT EXISTS (
       SELECT 1 FROM public.store_settings
       WHERE singleton = TRUE AND checkout_enabled = TRUE AND paymento_enabled = TRUE
     ) THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'session_lease_expired');
  END IF;

  v_event_key := 'paymento:request:' || p_token_hash;
  INSERT INTO public.payment_events (
    order_id, provider, provider_event_id, event_type, sanitized_payload,
    signature_valid, processed
  ) VALUES (
    p_order_id, 'paymento', v_event_key, 'payment.requested',
    jsonb_build_object('order_id', p_order_id, 'token_hash', p_token_hash),
    FALSE, TRUE
  ) ON CONFLICT (provider_event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  SELECT * INTO v_event FROM public.payment_events
  WHERE provider_event_id = v_event_key FOR UPDATE;
  IF v_event.provider <> 'paymento'
     OR v_event.event_type <> 'payment.requested'
     OR v_event.order_id <> p_order_id
     OR v_event.sanitized_payload->>'token_hash' <> p_token_hash THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'payment_token_conflict');
  END IF;

  UPDATE public.paymento_payment_sessions
  SET payment_token = p_payment_token,
      token_hash = p_token_hash,
      state = 'active',
      lease_id = NULL,
      lease_expires_at = NULL,
      expires_at = v_order.reservation_expires_at,
      updated_at = NOW()
  WHERE order_id = p_order_id AND state = 'creating' AND lease_id = p_lease_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'session_lease_expired');
  END IF;
  RETURN jsonb_build_object('success', TRUE, 'duplicate', v_inserted = 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_paymento_ipn(
  p_order_id UUID,
  p_payment_id TEXT,
  p_payment_token TEXT,
  p_token_hash TEXT,
  p_reported_status INTEGER,
  p_sanitized_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_registered_order UUID;
  v_matched BOOLEAN := FALSE;
  v_event_key TEXT;
  v_request_key TEXT;
  v_payload JSONB;
  v_event public.payment_events%ROWTYPE;
  v_inserted INTEGER;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Paymento IPN recording is service-role only.';
  END IF;
  IF p_order_id IS NULL OR p_payment_id IS NULL OR length(btrim(p_payment_id)) < 1 OR length(p_payment_id) > 200
     OR p_payment_token IS NULL OR length(p_payment_token) < 16 OR length(p_payment_token) > 200
     OR p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$'
     OR p_reported_status IS NULL OR p_reported_status < 0 OR p_reported_status > 10 THEN
    RAISE EXCEPTION 'Invalid Paymento callback identifiers.';
  END IF;

  v_request_key := 'paymento:request:' || p_token_hash;
  SELECT session.order_id INTO v_registered_order
  FROM public.paymento_payment_sessions AS session
  JOIN public.payment_events AS request_event
    ON request_event.order_id = session.order_id
   AND request_event.provider = 'paymento'
   AND request_event.provider_event_id = v_request_key
   AND request_event.event_type = 'payment.requested'
  WHERE session.token_hash = p_token_hash
    AND session.payment_token = p_payment_token
    AND session.state IN ('active', 'completed', 'needs_review');
  v_matched := FOUND AND v_registered_order = p_order_id;
  v_event_key := 'paymento:callback:' || p_token_hash || ':'
    || md5(btrim(p_payment_id) || ':' || p_order_id::TEXT || ':' || p_reported_status::TEXT);
  v_payload := COALESCE(p_sanitized_payload, '{}'::JSONB) || jsonb_build_object(
    'order_id', p_order_id,
    'payment_id', btrim(p_payment_id),
    'token_hash', p_token_hash,
    'reported_status', p_reported_status
  );

  INSERT INTO public.payment_events (
    order_id, provider, provider_event_id, event_type, sanitized_payload,
    signature_valid, processed, error_message
  ) VALUES (
    CASE WHEN v_matched THEN p_order_id ELSE NULL END,
    'paymento', v_event_key, 'payment.notification', v_payload, TRUE,
    (NOT v_matched OR p_reported_status <> 7),
    CASE WHEN v_matched THEN NULL ELSE 'Signed callback did not match a registered Paymento token and order.' END
  ) ON CONFLICT (provider_event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  SELECT * INTO v_event FROM public.payment_events
  WHERE provider_event_id = v_event_key FOR UPDATE;
  IF v_event.provider <> 'paymento'
     OR v_event.event_type <> 'payment.notification'
     OR v_event.sanitized_payload->>'token_hash' <> p_token_hash
     OR v_event.sanitized_payload->>'payment_id' <> btrim(p_payment_id)
     OR v_event.sanitized_payload->>'reported_status' <> p_reported_status::TEXT THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'callback_event_conflict');
  END IF;

  IF v_matched AND p_reported_status = 7 THEN
    INSERT INTO public.paymento_ipn_queue (
      provider_event_id, order_id, payment_id, token_hash,
      reported_status, callback_payload
    ) VALUES (
      v_event_key, p_order_id, btrim(p_payment_id), p_token_hash,
      p_reported_status, v_payload
    ) ON CONFLICT (provider_event_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'matched', v_matched,
    'duplicate', v_inserted = 0,
    'processed', v_event.processed,
    'queued', v_matched AND p_reported_status = 7,
    'event_id', v_event_key
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_paymento_ipn_callbacks(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  provider_event_id TEXT,
  lease_id UUID,
  order_id UUID,
  payment_id TEXT,
  payment_token TEXT,
  token_hash TEXT,
  reported_status INTEGER,
  attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Paymento callback claiming is service-role only.';
  END IF;
  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT q.id, q.provider_event_id, q.token_hash
    FROM public.paymento_ipn_queue AS q
    WHERE (
      (q.state = 'pending' AND q.next_attempt_at <= NOW())
      OR (q.state = 'processing' AND q.lease_expires_at <= NOW())
    )
      AND NOT EXISTS (
        SELECT 1 FROM public.paymento_ipn_queue AS earlier
        WHERE earlier.token_hash = q.token_hash
          AND earlier.id <> q.id
          AND earlier.state IN ('pending', 'processing')
          AND (earlier.created_at, earlier.id) < (q.created_at, q.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.paymento_ipn_token_locks AS active_lock
        WHERE active_lock.token_hash = q.token_hash
          AND active_lock.lease_expires_at > NOW()
      )
    ORDER BY q.created_at, q.id
    LIMIT v_limit
    FOR UPDATE OF q SKIP LOCKED
  ),
  claims AS MATERIALIZED (
    SELECT c.id, c.provider_event_id, c.token_hash, uuid_generate_v4() AS new_lease_id
    FROM candidates AS c
  ),
  acquired AS (
    INSERT INTO public.paymento_ipn_token_locks(token_hash, lease_id, lease_expires_at)
    SELECT c.token_hash, c.new_lease_id, NOW() + INTERVAL '5 minutes'
    FROM claims AS c
    ON CONFLICT (token_hash) DO UPDATE
      SET lease_id = EXCLUDED.lease_id,
          lease_expires_at = EXCLUDED.lease_expires_at
      WHERE public.paymento_ipn_token_locks.lease_expires_at <= NOW()
    RETURNING token_hash, lease_id
  ),
  updated AS (
    UPDATE public.paymento_ipn_queue AS q
    SET state = 'processing',
        attempts = q.attempts + 1,
        lease_id = acquired.lease_id,
        lease_expires_at = NOW() + INTERVAL '5 minutes',
        last_error = NULL
    FROM claims AS c
    JOIN acquired ON acquired.token_hash = c.token_hash
    WHERE q.id = c.id
    RETURNING q.provider_event_id, acquired.lease_id, q.order_id, q.payment_id,
      q.token_hash, q.reported_status, q.attempts
  )
  SELECT updated.provider_event_id, updated.lease_id, updated.order_id,
    updated.payment_id, session.payment_token, updated.token_hash,
    updated.reported_status, updated.attempts
  FROM updated
  JOIN public.paymento_payment_sessions AS session
    ON session.order_id = updated.order_id
   AND session.token_hash = updated.token_hash;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_paymento_ipn(
  p_provider_event_id TEXT,
  p_lease_id UUID,
  p_verified BOOLEAN,
  p_permanent_failure BOOLEAN,
  p_verified_token_hash TEXT,
  p_verified_order_id TEXT,
  p_verified_order_status INTEGER,
  p_verified_requested_amount NUMERIC,
  p_error TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_queue public.paymento_ipn_queue%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_request_key TEXT;
  v_reason TEXT;
  v_retry BOOLEAN;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Paymento callback completion is service-role only.';
  END IF;
  IF p_provider_event_id IS NULL OR p_lease_id IS NULL THEN
    RAISE EXCEPTION 'Paymento callback event and lease are required.';
  END IF;
  SELECT * INTO v_queue FROM public.paymento_ipn_queue
  WHERE provider_event_id = p_provider_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'callback_not_found');
  END IF;
  IF v_queue.state = 'completed' THEN
    RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE, 'processed', TRUE);
  END IF;
  IF v_queue.state <> 'processing' OR v_queue.lease_id IS DISTINCT FROM p_lease_id THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'lease_expired');
  END IF;

  IF p_verified IS DISTINCT FROM TRUE THEN
    v_retry := p_permanent_failure IS DISTINCT FROM TRUE AND v_queue.attempts < 8;
    UPDATE public.paymento_ipn_queue
    SET state = CASE WHEN v_retry THEN 'pending' ELSE 'needs_review' END,
        next_attempt_at = CASE WHEN v_retry
          THEN NOW() + make_interval(secs => LEAST(3600, 30 * power(2, LEAST(GREATEST(v_queue.attempts - 1, 0), 7))::INTEGER))
          ELSE next_attempt_at END,
        lease_id = NULL,
        lease_expires_at = NULL,
        last_error = left(COALESCE(NULLIF(p_error, ''), 'Paymento verification did not approve the payment.'), 1000)
    WHERE provider_event_id = p_provider_event_id;
    UPDATE public.payment_events
    SET error_message = left(COALESCE(NULLIF(p_error, ''), 'Paymento verification did not approve the payment.'), 1000)
    WHERE provider = 'paymento' AND provider_event_id = p_provider_event_id;
    DELETE FROM public.paymento_ipn_token_locks
    WHERE token_hash = v_queue.token_hash AND lease_id = p_lease_id;
    RETURN jsonb_build_object('success', FALSE, 'retry_scheduled', v_retry, 'needs_review', NOT v_retry);
  END IF;

  IF p_verified_token_hash IS DISTINCT FROM v_queue.token_hash
     OR p_verified_order_id IS DISTINCT FROM v_queue.order_id::TEXT
     OR p_verified_order_status IS DISTINCT FROM 8
     OR p_verified_requested_amount IS NULL THEN
    v_reason := 'Paymento Verify response did not match the stored token, order, approved status, or requested amount.';
  ELSE
    v_request_key := 'paymento:request:' || v_queue.token_hash;
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_events AS request_event
      WHERE request_event.provider = 'paymento'
        AND request_event.provider_event_id = v_request_key
        AND request_event.event_type = 'payment.requested'
        AND request_event.order_id = v_queue.order_id
    ) THEN
      v_reason := 'No registered Paymento request matches this callback.';
    END IF;
  END IF;

  IF v_reason IS NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_queue.order_id FOR UPDATE;
    IF NOT FOUND THEN
      v_reason := 'The local order no longer exists.';
    ELSIF v_order.payment_method <> 'paymento_crypto'::public.payment_method_type THEN
      v_reason := 'The local order does not use Paymento.';
    ELSIF round(p_verified_requested_amount, 2) <> round(v_order.total_usd, 2) THEN
      v_reason := 'The verified Paymento amount does not match the local order total.';
    ELSIF v_order.payment_status = 'captured'::public.payment_status
       AND v_order.status IN ('processing'::public.order_status, 'completed'::public.order_status) THEN
      IF v_order.payment_reference IS DISTINCT FROM v_queue.payment_id THEN
        v_reason := 'A separate Paymento payment was verified for an already paid order; manual review is required.';
      ELSE
      UPDATE public.paymento_ipn_queue
      SET state = 'completed', processed_at = NOW(), lease_id = NULL,
          lease_expires_at = NULL, last_error = NULL
      WHERE provider_event_id = p_provider_event_id;
      UPDATE public.payment_events
      SET processed = TRUE, processed_at = NOW(), error_message = NULL
      WHERE provider = 'paymento' AND provider_event_id = p_provider_event_id;
      UPDATE public.paymento_payment_sessions
      SET state = 'completed', updated_at = NOW()
      WHERE order_id = v_queue.order_id AND token_hash = v_queue.token_hash AND state = 'active';
      DELETE FROM public.paymento_ipn_token_locks
      WHERE token_hash = v_queue.token_hash AND lease_id = p_lease_id;
      RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE, 'processed', TRUE);
      END IF;
    ELSIF v_order.status <> 'pending'::public.order_status
       OR v_order.payment_status <> 'pending'::public.payment_status THEN
      v_reason := 'The local order is no longer waiting for Paymento confirmation.';
    ELSIF v_order.reservation_expires_at IS NOT NULL AND v_order.reservation_expires_at < NOW() THEN
      v_reason := 'The order inventory reservation expired before Paymento confirmation; manual review is required.';
    END IF;
  END IF;

  IF v_reason IS NOT NULL THEN
    UPDATE public.paymento_ipn_queue
    SET state = 'needs_review', lease_id = NULL, lease_expires_at = NULL, last_error = v_reason
    WHERE provider_event_id = p_provider_event_id;
    UPDATE public.payment_events
    SET error_message = v_reason
    WHERE provider = 'paymento' AND provider_event_id = p_provider_event_id;
    UPDATE public.paymento_payment_sessions
    SET state = 'needs_review', updated_at = NOW()
    WHERE order_id = v_queue.order_id AND token_hash = v_queue.token_hash AND state = 'active';
    DELETE FROM public.paymento_ipn_token_locks
    WHERE token_hash = v_queue.token_hash AND lease_id = p_lease_id;
    RETURN jsonb_build_object('success', FALSE, 'needs_review', TRUE, 'reason', v_reason);
  END IF;

  UPDATE public.orders
  SET status = 'processing'::public.order_status,
      payment_status = 'captured'::public.payment_status,
      payment_reference = v_queue.payment_id,
      reservation_expires_at = NULL,
      updated_at = NOW()
  WHERE id = v_order.id;
  UPDATE public.paymento_payment_sessions
  SET state = 'completed', updated_at = NOW()
  WHERE order_id = v_queue.order_id AND token_hash = v_queue.token_hash AND state = 'active';
  UPDATE public.paymento_ipn_queue
  SET state = 'completed', processed_at = NOW(), lease_id = NULL,
      lease_expires_at = NULL, last_error = NULL
  WHERE provider_event_id = p_provider_event_id;
  UPDATE public.payment_events
  SET processed = TRUE, processed_at = NOW(), error_message = NULL
  WHERE provider = 'paymento' AND provider_event_id = p_provider_event_id;
  DELETE FROM public.paymento_ipn_token_locks
  WHERE token_hash = v_queue.token_hash AND lease_id = p_lease_id;
  RETURN jsonb_build_object('success', TRUE, 'processed', TRUE, 'order_id', v_order.id);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, public.delivery_type, public.payment_method_type, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, public.delivery_type, public.payment_method_type, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB)
  TO authenticated;
REVOKE ALL ON FUNCTION public.reserve_paymento_payment_session(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_paymento_payment_session(UUID, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.mark_paymento_payment_session_needs_review(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_paymento_payment_session_needs_review(UUID, UUID, TEXT, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.register_paymento_payment_request(UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_paymento_payment_request(UUID, TEXT, TEXT, UUID)
  TO service_role;
REVOKE ALL ON FUNCTION public.record_paymento_ipn(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_paymento_ipn(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB)
  TO service_role;
REVOKE ALL ON FUNCTION public.claim_paymento_ipn_callbacks(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paymento_ipn_callbacks(INTEGER)
  TO service_role;
REVOKE ALL ON FUNCTION public.finish_paymento_ipn(TEXT, UUID, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_paymento_ipn(TEXT, UUID, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, NUMERIC, TEXT)
  TO service_role;

COMMIT;
