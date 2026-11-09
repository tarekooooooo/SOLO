-- Explicit service-role-only RLS policy for the private launch settings.
-- anon/authenticated have no table privileges; checkout remains disabled.
BEGIN;
DROP POLICY IF EXISTS store_settings_service_role ON public.store_settings;
CREATE POLICY store_settings_service_role ON public.store_settings
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);
COMMIT;
