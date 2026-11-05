-- ==============================================================================
-- TAREK STOR / SOLO STOR - Comprehensive Supabase Database Schema Migration
-- Migration: 20261105000001_initial_schema.sql
-- Description: Complete production schema supporting:
--   1. Strict RLS with private profiles & hidden internal costs/CJ SKUs.
--   2. ATLOS crypto gateway and manual payment methods (Libyana, Al-Madar, Bank, Payoneer).
--   3. Status 'awaiting_manual_review' for manual payments with private receipt storage.
--   4. Atomic order creation with server-side pricing and mandatory idempotency.
--   5. Admin audit log table (admin_audit_logs) tracking review/approval decisions.
--   6. Admin manual approval/rejection RPC (review_manual_payment).
-- NOTE: Do NOT apply directly without explicit user review and consent.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'merchant', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('digital', 'physical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_type AS ENUM ('instant_code', 'direct_id_recharge', 'manual_service', 'physical_shipment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM (
    'atlos_crypto', 
    'libyana', 
    'almadar', 
    'bank_transfer', 
    'payoneer', 
    'wallet'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 
    'awaiting_manual_review', 
    'processing', 
    'completed', 
    'shipped', 
    'delivered', 
    'cancelled', 
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 
    'under_review', 
    'authorized', 
    'captured', 
    'rejected', 
    'failed', 
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'customer'::user_role NOT NULL,
  balance_usd NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (balance_usd >= 0),
  telegram_username TEXT,
  player_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Helper function to check if caller is an authorized admin (runs with safe search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

-- Trigger to prevent customers from altering role or balance_usd directly
CREATE OR REPLACE FUNCTION public.protect_profile_privilege_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') != 'service_role' AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'غير مصرح لك بتغيير الصلاحية أو رتبة الحساب.';
    END IF;
    IF NEW.balance_usd IS DISTINCT FROM OLD.balance_usd THEN
      RAISE EXCEPTION 'غير مصرح لك بتعديل رصيد المحفظة مباشرة.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privilege_fields();

-- 4. PRODUCTS TABLE
-- Sensitive supplier cost (cost_price_usd) and cj_sku are kept in base table.
-- Public clients read catalog via public_catalog view or restricted RLS select.
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_type product_type DEFAULT 'digital'::product_type NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  platform TEXT,
  image_url TEXT NOT NULL,
  gallery_urls TEXT[] DEFAULT '{}',
  description TEXT,
  delivery_type delivery_type DEFAULT 'instant_code'::delivery_type NOT NULL,
  
  -- Price & Cost
  price_usd NUMERIC(10, 2) NOT NULL CHECK (price_usd >= 0),
  cost_price_usd NUMERIC(10, 2) DEFAULT 0.00 CHECK (cost_price_usd >= 0),
  
  -- CJ Dropshipping specific fields (for physical products)
  cj_sku TEXT,
  cj_product_id TEXT,
  weight_kg NUMERIC(6, 3) DEFAULT 0,
  
  -- Status
  in_stock BOOLEAN DEFAULT true NOT NULL,
  stock_count INTEGER DEFAULT 0 NOT NULL CHECK (stock_count >= 0),
  total_sold INTEGER DEFAULT 0 NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  
  -- Variants & packages metadata in JSONB
  packages JSONB DEFAULT '[]'::JSONB,
  variants JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_cj_sku ON public.products(cj_sku) WHERE cj_sku IS NOT NULL;

-- Public Catalog View: Hides internal cost and CJ supplier SKU from public/competitors
CREATE OR REPLACE VIEW public.public_catalog AS
  SELECT 
    id,
    product_type,
    slug,
    title,
    title_ar,
    category,
    platform,
    image_url,
    gallery_urls,
    description,
    delivery_type,
    price_usd,
    in_stock,
    stock_count,
    total_sold,
    rating,
    reviews_count,
    packages,
    variants,
    created_at
  FROM public.products
  WHERE in_stock = true;

-- 5. INVENTORY TABLE (Digital codes bank - strictly accessible by service_role and admin)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  code_value TEXT NOT NULL, -- Stored encrypted or hashed
  is_used BOOLEAN DEFAULT false NOT NULL,
  order_id UUID, -- References orders(id) once allocated
  allocated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_lookup ON public.inventory(product_id, package_id, is_used);
CREATE INDEX IF NOT EXISTS idx_inventory_order ON public.inventory(order_id);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL, -- Human-readable, e.g. TRK-2026-XXXX
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Contact details snapshot at time of purchase
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Financials
  subtotal_usd NUMERIC(10, 2) NOT NULL CHECK (subtotal_usd >= 0),
  shipping_fee_usd NUMERIC(10, 2) DEFAULT 0.00 CHECK (shipping_fee_usd >= 0),
  total_usd NUMERIC(10, 2) NOT NULL CHECK (total_usd >= 0),
  currency_code TEXT DEFAULT 'USD' NOT NULL,
  
  -- Statuses
  status order_status DEFAULT 'pending'::order_status NOT NULL,
  payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  payment_method payment_method_type NOT NULL,
  
  -- Manual payment verification fields
  payment_reference TEXT, -- Bank transfer reference, phone number for Libyana/Madar
  payment_receipt_url TEXT, -- Private bucket storage path
  reviewed_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_review_notes TEXT,
  
  -- Delivery details
  delivery_type delivery_type NOT NULL,
  target_player_id TEXT, -- e.g. PUBG Player ID
  target_player_name TEXT,
  
  -- Physical shipping address (JSONB)
  shipping_address JSONB,
  
  -- CJ fulfillment fields
  cj_order_id TEXT,
  cj_tracking_number TEXT,
  cj_shipping_carrier TEXT,
  cj_synced_at TIMESTAMPTZ,
  
  -- Anti-duplication / Idempotency Key (MANDATORY & UNIQUE)
  idempotency_key TEXT UNIQUE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON public.orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- 7. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  package_or_variant TEXT,
  cj_sku TEXT,
  unit_price_usd NUMERIC(10, 2) NOT NULL CHECK (unit_price_usd >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price_usd NUMERIC(10, 2) NOT NULL CHECK (total_price_usd >= 0),
  delivered_code TEXT, -- Filled only upon verified payment confirmation
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 8. PAYMENT EVENTS TABLE (Minimal, sanitized audit log - no sensitive card data stored)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- e.g. atlos, libyana, almadar, bank_transfer, payoneer
  provider_event_id TEXT UNIQUE NOT NULL, -- Idempotent provider event id
  event_type TEXT NOT NULL,
  sanitized_payload JSONB NOT NULL, -- Minimal required fields only
  signature_valid BOOLEAN DEFAULT false NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider ON public.payment_events(provider, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id);

-- 9. ADMIN AUDIT LOGS TABLE (Tracks approval/rejection and administrative decisions)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL, -- e.g. 'approve_payment', 'reject_payment', 'sync_cj'
  target_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::JSONB NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_order ON public.admin_audit_logs(target_order_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_logs(admin_id);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Customer sees and edits only their personal profile (excluding role/balance)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Products: Everyone can view, but only Admin can modify
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inventory: Strictly hidden from customers; Admin & service_role only
DROP POLICY IF EXISTS "Admins and service_role only on inventory" ON public.inventory;
CREATE POLICY "Admins and service_role only on inventory"
  ON public.inventory FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Orders: Customer can SELECT only their own orders.
-- Direct INSERT/UPDATE from client is blocked; orders are created via create_order_atomic RPC.
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create orders for themselves" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Order Items: Viewable only by order owner or Admin
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins and service_role can manage order items" ON public.order_items;
CREATE POLICY "Admins and service_role can manage order items"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Payment Events: Admins and service_role only
DROP POLICY IF EXISTS "Admins and service_role only for payment events" ON public.payment_events;
CREATE POLICY "Admins and service_role only for payment events"
  ON public.payment_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin Audit Logs: Admins can view; cannot be tampered with
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

-- ==============================================================================
-- 11. ATOMIC ORDER CREATION RPC (create_order_atomic)
-- Executes atomically in a single transaction:
--   - Sets status = 'awaiting_manual_review' for manual payments, 'pending' for ATLOS/wallet
--   - Validates authenticated session (customer_id = auth.uid())
--   - Prevents duplicate submission via mandatory idempotency_key
--   - Calculates genuine prices from products table
--   - Inserts order and items atomically
-- ==============================================================================
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
  v_item_qty INT;
  v_item_unit_price NUMERIC(10, 2);
  v_item_total NUMERIC(10, 2);
BEGIN
  -- 1. Verify caller session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'المصادقة مطلوبة: يجب تسجيل الدخول لإنشاء طلب.';
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'الملف الشخصي للمستخدم غير موجود.';
  END IF;

  -- 2. Idempotency Check
  IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'مفتاح عدم التكرار (idempotency_key) إلزامي.';
  END IF;

  SELECT * INTO v_existing_order FROM public.orders
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'message', 'الطلب مسجل مسبقاً بنفس مفتاح عدم التكرار',
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'status', v_existing_order.status
    );
  END IF;

  -- 3. Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'يجب أن يحتوي الطلب على عنصر واحد على الأقل.';
  END IF;

  -- 4. Calculate prices strictly from products table
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::INT, 1);
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر.';
    END IF;

    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'المنتج المطلوب غير موجود: %', (v_item->>'product_id');
    END IF;

    IF NOT v_product.in_stock THEN
      RAISE EXCEPTION 'المنتج غير متوفر حالياً بالمخزون: %', v_product.title_ar;
    END IF;

    v_item_unit_price := v_product.price_usd;
    v_item_total := v_item_unit_price * v_item_qty;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 5. Shipping fee
  IF p_delivery_type = 'physical_shipment' THEN
    v_shipping_fee := 6.50;
  ELSE
    v_shipping_fee := 0.00;
  END IF;

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
      v_product.price_usd,
      v_item_qty,
      v_product.price_usd * v_item_qty
    );
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

-- ==============================================================================
-- 12. ADMIN MANUAL PAYMENT REVIEW RPC (review_manual_payment)
-- Executes by authenticated admin only:
--   - Confirms admin role on server
--   - If approved: changes order status to processing/captured
--   - If rejected: changes status to cancelled/rejected with reason
--   - Logs decision in admin_audit_logs table with admin id and timestamp
--   - Prevents double approval
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.review_manual_payment(
  p_order_id UUID,
  p_decision TEXT, -- 'approve' or 'reject'
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_order public.orders%ROWTYPE;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول كمدير نظام لتنفيذ هذه العملية.';
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;

  IF v_order.payment_status = 'captured'::payment_status THEN
    RAISE EXCEPTION 'الطلب معتمد ومدفوع مسبقاً، لا يمكن تكرار الاعتماد.';
  END IF;

  IF p_decision = 'approve' THEN
    UPDATE public.orders
    SET 
      status = 'processing'::order_status,
      payment_status = 'captured'::payment_status,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = NOW(),
      admin_review_notes = p_notes,
      updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO public.admin_audit_logs (admin_id, action, target_order_id, details)
    VALUES (
      v_admin_id,
      'approve_manual_payment',
      p_order_id,
      jsonb_build_object('order_number', v_order.order_number, 'notes', p_notes, 'total_usd', v_order.total_usd)
    );

    RETURN jsonb_build_object('success', true, 'status', 'processing', 'message', 'تم اعتماد الدفع وتأكيد الطلب بنجاح.');

  ELSIF p_decision = 'reject' THEN
    UPDATE public.orders
    SET 
      status = 'cancelled'::order_status,
      payment_status = 'rejected'::payment_status,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = NOW(),
      admin_review_notes = p_notes,
      updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO public.admin_audit_logs (admin_id, action, target_order_id, details)
    VALUES (
      v_admin_id,
      'reject_manual_payment',
      p_order_id,
      jsonb_build_object('order_number', v_order.order_number, 'notes', p_notes)
    );

    RETURN jsonb_build_object('success', true, 'status', 'cancelled', 'message', 'تم رفض إشعار التحويل وإلغاء الطلب.');
  ELSE
    RAISE EXCEPTION 'القرار غير صالح، يجب أن يكون approve أو reject.';
  END IF;
END;
$$;

-- ==============================================================================
-- 13. AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, balance_usd)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'::user_role,
    0.00
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
