-- =====================================================================
-- SOLO hardening migration  (project ref: ttphmvjlmsavsppkmvcu)
-- Run once, in the SQL Editor or via `apply_migration` with a read-write connection.
-- Repeatable only while these tables have no additional policies: all policies
-- on the listed tables are deliberately dropped and rebuilt below.
-- Does NOT add ATLOS columns/tables; do that in a separate incremental migration.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Private schema + admin helper (not exposed through the REST API)
--    Avoids policy recursion on profiles and the "SECURITY DEFINER callable
--    via /rest/v1/rpc" advisor warnings.
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Existing SECURITY DEFINER functions
--    - handle_new_user: fixed search_path (types/tables fully qualified)
--    - EXECUTE revoked from API roles. The auth.users trigger and the
--      event trigger keep working: privileges are checked at CREATE TRIGGER
--      time, not when the trigger fires.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    'customer'::public.user_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Table privileges (least privilege; RLS stays on top of this)
-- ---------------------------------------------------------------------
-- profiles: users may edit only harmless columns. role and balance_usd are
-- no longer writable from the client (change them with service_role).
revoke all privileges on table public.profiles from public, anon, authenticated;
revoke all privileges (id, email, name, phone, avatar_url, role, balance_usd,
  telegram_username, player_tag, created_at, updated_at)
  on table public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone, avatar_url, telegram_username, player_tag)
  on public.profiles to authenticated;

-- orders / order_items: clients read only. Orders are created and updated
-- by an Edge Function using service_role (checkout stays closed until then).
-- Admin may change order status only.
revoke all privileges on table public.orders from public, anon, authenticated;
revoke all privileges on table public.order_items from public, anon, authenticated;
revoke all privileges (id, order_number, customer_id, customer_name, customer_email,
  customer_phone, subtotal_usd, shipping_fee_usd, total_usd, currency_code, status,
  payment_status, delivery_type, target_player_id, target_player_name, shipping_address,
  cj_order_id, cj_tracking_number, cj_shipping_carrier, cj_synced_at, idempotency_key,
  created_at, updated_at)
  on table public.orders from public, anon, authenticated;
revoke all privileges (id, order_id, product_id, product_title, package_or_variant,
  cj_sku, unit_price_usd, quantity, total_price_usd, delivered_code, created_at)
  on table public.order_items from public, anon, authenticated;
grant select on table public.orders, public.order_items to authenticated;
grant update (status) on table public.orders to authenticated;

-- products: allow only the storefront-safe projection to be read publicly.
-- The public_catalog view is SECURITY INVOKER, so callers need these exact
-- underlying columns. Authenticated admins may manage products through the
-- admin-only RLS policies below; TRUNCATE is never granted.
revoke all privileges on table public.products from public, anon, authenticated;
revoke all privileges (id, product_type, slug, title, title_ar, category, platform,
  image_url, gallery_urls, description, delivery_type, price_usd, cost_price_usd,
  cj_sku, cj_product_id, weight_kg, in_stock, stock_count, total_sold, rating,
  reviews_count, packages, variants, created_at, updated_at)
  on table public.products from public, anon, authenticated;
grant select (
  id, product_type, slug, title, title_ar, category, platform, image_url,
  gallery_urls, description, delivery_type, price_usd, in_stock, stock_count,
  total_sold, rating, reviews_count, packages, variants, created_at
) on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;
grant select on table public.public_catalog to anon, authenticated;

-- Inventory contains redeemable codes. Admins may read through RLS; writes
-- must use trusted server-side functions (service_role), never client roles.
revoke all privileges on table public.inventory from public, anon, authenticated;
revoke all privileges (id, product_id, package_id, code_value, is_used, order_id,
  allocated_at, created_at)
  on table public.inventory from public, anon, authenticated;
grant select on table public.inventory to authenticated;

-- Payment events are server-written. Admins may read through RLS, but neither
-- API role may insert, update, delete, or truncate them.
revoke all privileges on table public.payment_events from public, anon, authenticated;
revoke all privileges (id, order_id, provider, provider_event_id, event_type, payload,
  signature_valid, processed, processed_at, error_message, created_at)
  on table public.payment_events from public, anon, authenticated;
grant select on table public.payment_events to authenticated;

-- ---------------------------------------------------------------------
-- 4. Row Level Security policies (rebuilt from scratch)
--    auth.uid()/is_admin() wrapped in (select ...) so they are evaluated once
--    per query, not per row. One permissive policy per role+action.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','products','inventory','orders','order_items','payment_events')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.inventory      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.payment_events enable row level security;

-- profiles: own row (or admin) can be read; own row can be updated
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- products: public read of in-stock items; admin full control
create policy products_select_anon on public.products
  for select to anon
  using (in_stock = true);

create policy products_select_auth on public.products
  for select to authenticated
  using (in_stock = true or (select private.is_admin()));

create policy products_admin_insert on public.products
  for insert to authenticated
  with check ((select private.is_admin()));

create policy products_admin_update on public.products
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy products_admin_delete on public.products
  for delete to authenticated
  using ((select private.is_admin()));

-- inventory: admin only
create policy inventory_admin_all on public.inventory
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- orders: owner or admin reads; admin updates status
create policy orders_select on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_admin()));

create policy orders_admin_update on public.orders
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- order_items: visible through the parent order
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = (select auth.uid()) or (select private.is_admin()))
    )
  );

-- payment_events: admin read only (written by service_role)
create policy payment_events_admin_select on public.payment_events
  for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- 5. Performance
-- ---------------------------------------------------------------------
create index if not exists idx_order_items_product_id
  on public.order_items (product_id);

commit;

-- =====================================================================
-- The safe-column grants for products are included above because the current
-- storefront reads the SECURITY INVOKER public_catalog view. Do not add a
-- table-wide SELECT grant on products: cost_price_usd and cj_sku are private.
-- Future-table default privileges are intentionally not changed here because
-- they can affect unrelated features and should be reviewed separately.
-- =====================================================================

-- =====================================================================
-- VERIFY after running (all should return no rows / false):
--
--   select grantee, column_name from information_schema.column_privileges
--   where table_schema='public' and table_name='profiles'
--     and privilege_type='UPDATE' and column_name in ('role','balance_usd');
--
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='orders'
--     and grantee in ('anon','authenticated') and privilege_type in ('INSERT','DELETE');
--
--   -- Returns no rows: no API role can TRUNCATE protected tables, and anon
--   -- cannot write products. Inventory and payment_events are server-written.
--   select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--   where table_schema='public'
--     and grantee in ('anon','authenticated')
--     and (
--       (table_name in ('profiles','orders','order_items','products','inventory','payment_events')
--         and privilege_type='TRUNCATE')
--       or (grantee='anon' and table_name in ('products','orders','order_items','inventory','payment_events')
--         and privilege_type in ('INSERT','UPDATE','DELETE'))
--       or (table_name in ('inventory','payment_events')
--         and privilege_type in ('INSERT','UPDATE','DELETE'))
--     )
--   limit 100;
--
--   select has_function_privilege('anon', 'public.handle_new_user()', 'execute');
--   select has_function_privilege('authenticated', 'public.handle_new_user()', 'execute');
--   select has_function_privilege('anon', 'public.rls_auto_enable()', 'execute');
--   select has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute');
--
-- Then re-run the Supabase security + performance advisors.
-- =====================================================================
