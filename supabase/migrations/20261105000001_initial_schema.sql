-- ==============================================================================
-- TAREK STOR / SOLO STOR - Supabase Database Schema Migration
-- Migration: 20261105000001_initial_schema.sql
-- Description: Creates initial tables, enums, triggers, and Row Level Security (RLS)
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
  CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded');
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

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. PRODUCTS TABLE (Digital game currencies, cards, and CJ physical gear)
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

-- 5. INVENTORY TABLE (Digital codes bank with encryption readiness)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  code_value TEXT NOT NULL, -- Stored encrypted or hashed via Edge Function
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
  
  -- Anti-duplication / Idempotency Key
  idempotency_key TEXT UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
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
  unit_price_usd NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price_usd NUMERIC(10, 2) NOT NULL,
  delivered_code TEXT, -- If instant digital code delivered
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 8. PAYMENT EVENTS TABLE (Webhook audit log with signature verification tracking)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- e.g. stripe, moyasar, tap, paypal
  provider_event_id TEXT UNIQUE NOT NULL, -- Idempotent provider event id
  event_type TEXT NOT NULL, -- e.g. payment_intent.succeeded
  payload JSONB NOT NULL,
  signature_valid BOOLEAN DEFAULT false NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider ON public.payment_events(provider, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Products Policies
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert or modify products"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
    )
  );

-- Inventory Policies (Codes bank)
CREATE POLICY "Admins can view and manage inventory"
  ON public.inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
    )
  );

-- Orders Policies
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id OR customer_id IS NULL
  );

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
    )
  );

-- Order Items Policies
CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
        ))
    )
  );

-- Payment Events Policies (Strictly restricted to backend service role)
CREATE POLICY "Only service_role and admins can view payment events"
  ON public.payment_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
    )
  );

-- 10. AUTOMATIC PROFILE CREATION TRIGGER (When a new user signs up via Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
