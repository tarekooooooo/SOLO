-- Keep the catalog availability flag consistent after an admin imports new
-- digital codes. The existing import function already refreshes stock_count,
-- but previously left in_stock false after a product had sold out.
-- Preserve package delivery compatibility using the self-contained helper
-- defined in 20261111030901_paymento_crypto_gateway.sql, not PR #2's helper.
BEGIN;

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
  IF jsonb_typeof(v_packages) IS DISTINCT FROM 'array' THEN
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
    private.solo_package_supports_delivery(
      v_delivery_type, v_package, 'instant_code'::public.delivery_type
    )
    OR private.solo_package_supports_delivery(
      v_delivery_type, v_package, 'direct_id_recharge'::public.delivery_type
    )
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
  SET stock_count = v_available::INTEGER,
      in_stock = v_available > 0,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', TRUE, 'inserted_count', v_inserted, 'available_count', v_available);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_import_inventory(UUID, UUID, TEXT, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_inventory(UUID, UUID, TEXT, TEXT[])
  TO service_role;

COMMIT;
