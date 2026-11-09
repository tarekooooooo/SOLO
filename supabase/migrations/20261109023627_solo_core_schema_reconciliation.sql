-- SOLO forward schema reconciliation for the live project.
-- Do not edit/replay the already-applied initial_schema migration.
-- Checkout is explicitly kept disabled. No payment secrets are used here.
BEGIN;

-- Fail closed if this is not the expected existing SOLO schema.
DO $$
BEGIN
  IF to_regclass('public.orders') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.products') IS NULL
     OR to_regclass('public.payment_events') IS NULL THEN
    RAISE EXCEPTION 'Expected SOLO core tables are missing; aborting schema reconciliation.';
  END IF;
END $$;

-- The live database predates the payment method type. Create the type without
-- modifying the previously applied initial migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_method_type'
  ) THEN
    CREATE TYPE public.payment_method_type AS ENUM (
      'atlos_crypto', 'libyana', 'almadar', 'bank_transfer', 'payoneer', 'wallet'
    );
  END IF;
END $$;

-- Add the values expected by the manual-payment and ATLOS RPCs. These labels
-- are not used by any DDL in this migration; functions are deployed later.
ALTER TYPE public.order_status
  ADD VALUE IF NOT EXISTS 'awaiting_manual_review' BEFORE 'processing';
ALTER TYPE public.payment_status
  ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.payment_status
  ADD VALUE IF NOT EXISTS 'rejected';

-- Add payment-review and inventory-reservation metadata required by the RPCs.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method_type,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;

-- No historical orders were present at inspection. Abort rather than invent a
-- payment method or idempotency key if that changes before this migration runs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE payment_method IS NULL) THEN
    RAISE EXCEPTION 'Orders without payment_method exist; backfill them explicitly before continuing.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE idempotency_key IS NULL) THEN
    RAISE EXCEPTION 'Orders without idempotency_key exist; backfill them explicitly before continuing.';
  END IF;
END $$;
ALTER TABLE public.orders ALTER COLUMN payment_method SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN idempotency_key SET NOT NULL;

-- Align idempotency with the customer-scoped contract used by create_order_atomic.
-- The live schema currently has a global single-column unique constraint.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_idempotency_key_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_customer_idempotency_unique'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_customer_idempotency_unique UNIQUE (customer_id, idempotency_key);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_reviewed_by_admin
  ON public.orders (reviewed_by_admin_id);

-- Secure launch switch. Seed it closed and force it closed on a pre-existing
-- singleton row as a safety measure; never enable it in this migration.
CREATE TABLE IF NOT EXISTS public.store_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  checkout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.store_settings (singleton, checkout_enabled)
VALUES (TRUE, FALSE)
ON CONFLICT (singleton) DO UPDATE
  SET checkout_enabled = FALSE,
      updated_at = NOW();
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.store_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.store_settings TO service_role;

-- Administrative audit table required by manual-payment review.
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_order
  ON public.admin_audit_logs (target_order_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin
  ON public.admin_audit_logs (admin_id);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.admin_audit_logs TO service_role;
DROP POLICY IF EXISTS admin_audit_logs_admin_select ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_admin_select ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

-- Keep the legacy raw payload column for now to avoid destructive data loss,
-- but all new payment handling must write only this sanitized projection.
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS sanitized_payload JSONB NOT NULL DEFAULT '{}'::JSONB;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_events TO service_role;

COMMIT;
