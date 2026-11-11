-- Add the Paymento enum value in its own committed migration.
-- PostgreSQL does not allow a new enum value to be used before this transaction commits.
BEGIN;

ALTER TYPE public.payment_method_type
  ADD VALUE IF NOT EXISTS 'paymento_crypto';

COMMIT;
