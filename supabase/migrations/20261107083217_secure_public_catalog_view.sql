-- SOLO security hardening: public catalog view runs with caller privileges.
-- Grant only storefront-safe columns; RLS still restricts visible rows to in-stock products.
GRANT SELECT (
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
) ON TABLE public.products TO anon, authenticated;

DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (in_stock = TRUE);

CREATE OR REPLACE VIEW public.public_catalog
WITH (security_barrier = TRUE, security_invoker = TRUE)
AS
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
  WHERE in_stock = TRUE;

GRANT SELECT ON TABLE public.public_catalog TO anon, authenticated;
