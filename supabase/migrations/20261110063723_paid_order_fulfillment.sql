BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT;

-- Reserve exact package codes in the same transaction that inserts each order item.
CREATE OR REPLACE FUNCTION public.reserve_codes_after_order_item_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order_delivery public.delivery_type;
  v_product_delivery public.delivery_type;
  v_reserved INTEGER;
BEGIN
  SELECT order_row.delivery_type, product_row.delivery_type
    INTO v_order_delivery, v_product_delivery
  FROM public.orders AS order_row
  JOIN public.products AS product_row ON product_row.id = NEW.product_id
  WHERE order_row.id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_or_product_not_found';
  END IF;

  IF v_order_delivery = 'instant_code'::public.delivery_type THEN
    IF v_product_delivery <> 'instant_code'::public.delivery_type
       OR NEW.package_or_variant IS NULL
       OR NEW.quantity < 1 THEN
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
$$;

REVOKE ALL ON FUNCTION public.reserve_codes_after_order_item_insert()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reserve_codes_after_order_item_insert ON public.order_items;
CREATE TRIGGER reserve_codes_after_order_item_insert
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.reserve_codes_after_order_item_insert();

-- Return unused code reservations when a payment is rejected/failed.
CREATE OR REPLACE FUNCTION public.release_codes_after_payment_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.payment_status IN ('rejected'::public.payment_status, 'failed'::public.payment_status)
     AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    UPDATE public.inventory
    SET order_id = NULL,
        allocated_at = NULL
    WHERE order_id = NEW.id
      AND is_used = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.release_codes_after_payment_rejection()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS release_codes_after_payment_rejection ON public.orders;
CREATE TRIGGER release_codes_after_payment_rejection
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW
WHEN (NEW.payment_status IN ('rejected'::public.payment_status, 'failed'::public.payment_status))
EXECUTE FUNCTION public.release_codes_after_payment_rejection();

-- Admin-only, idempotent paid-order fulfillment. Raw codes never appear in its response or audit details.
CREATE OR REPLACE FUNCTION public.admin_fulfill_order(
  p_admin_user_id UUID,
  p_order_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_codes TEXT;
  v_item_code_count INTEGER;
  v_delivered_code_count INTEGER := 0;
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
  ELSIF v_order.delivery_type IN (
    'direct_id_recharge'::public.delivery_type,
    'manual_service'::public.delivery_type
  ) THEN
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
      'delivered_code_count', v_delivered_code_count
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'completed',
    'delivered_code_count', v_delivered_code_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fulfill_order(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fulfill_order(UUID, UUID, TEXT)
  TO service_role;

-- Prevent line breaks inside a single code because multiple codes are stored
-- as newline-separated values in order_items.delivered_code.
CREATE OR REPLACE FUNCTION public.admin_import_inventory(
  p_admin_user_id UUID,
  p_product_id UUID,
  p_package_id TEXT,
  p_codes TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_delivery_type public.delivery_type;
  v_packages JSONB;
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
  IF NOT FOUND OR v_delivery_type <> 'instant_code'::public.delivery_type THEN
    RAISE EXCEPTION 'instant_code_product_required';
  END IF;
  IF jsonb_typeof(v_packages) <> 'array' OR NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_packages) AS package(value)
    WHERE COALESCE(package.value->>'id', package.value->>'package_id') = btrim(p_package_id)
  ) THEN
    RAISE EXCEPTION 'package_not_found';
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
$$;

REVOKE ALL ON FUNCTION public.admin_import_inventory(UUID, UUID, TEXT, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_inventory(UUID, UUID, TEXT, TEXT[])
  TO service_role;

COMMIT;
