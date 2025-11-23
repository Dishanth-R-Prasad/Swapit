-- Add auction fields to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS is_auction boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auction_end_date timestamp with time zone;

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_listing_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  offerer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  UNIQUE(auction_listing_id, offered_item_id)
);

-- Enable RLS on offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Offers policies
CREATE POLICY "Users can view offers on their auctions"
ON public.offers FOR SELECT
USING (
  auction_listing_id IN (
    SELECT id FROM public.items WHERE user_id = auth.uid()
  ) OR offerer_user_id = auth.uid()
);

CREATE POLICY "Users can create offers"
ON public.offers FOR INSERT
WITH CHECK (auth.uid() = offerer_user_id);

CREATE POLICY "Auction owners can update offer status"
ON public.offers FOR UPDATE
USING (
  auction_listing_id IN (
    SELECT id FROM public.items WHERE user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_offers_auction_listing ON public.offers(auction_listing_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_items_auction ON public.items(is_auction) WHERE is_auction = true;

-- Update seed function to include auction items
CREATE OR REPLACE FUNCTION public.seed_auction_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_ids uuid[];
  random_user_id uuid;
BEGIN
  -- Get existing user IDs from profiles
  SELECT ARRAY_AGG(id) INTO user_ids FROM public.profiles LIMIT 10;
  
  -- If no users exist, exit
  IF array_length(user_ids, 1) IS NULL THEN
    RAISE NOTICE 'No users found. Run seed_mock_users() first.';
    RETURN;
  END IF;
  
  -- Insert 5 auction items
  FOR i IN 1..5 LOOP
    random_user_id := user_ids[1 + floor(random() * array_length(user_ids, 1))];
    
    INSERT INTO public.items (
      user_id, title, category, description, price, is_donation, 
      city, pincode, photo_url, is_auction, auction_end_date, status,
      estimated_value
    ) VALUES (
      random_user_id,
      CASE i
        WHEN 1 THEN 'Vintage Record Player - Auction'
        WHEN 2 THEN 'Gaming Console Bundle - Auction'
        WHEN 3 THEN 'Designer Backpack - Auction'
        WHEN 4 THEN 'Professional Camera Kit - Auction'
        ELSE 'Collectible Action Figures Set - Auction'
      END,
      CASE i
        WHEN 1 THEN 'Electronics'
        WHEN 2 THEN 'Electronics'
        WHEN 3 THEN 'Clothing'
        WHEN 4 THEN 'Electronics'
        ELSE 'Books'
      END,
      CASE i
        WHEN 1 THEN 'Fully restored vintage record player from the 1970s. Perfect working condition.'
        WHEN 2 THEN 'Latest generation gaming console with 5 popular games and 2 controllers.'
        WHEN 3 THEN 'Authentic designer backpack, barely used. Original packaging included.'
        WHEN 4 THEN 'Professional DSLR camera with multiple lenses and accessories.'
        ELSE 'Complete set of limited edition collectible figures. Mint condition.'
      END,
      150 + (i * 50),
      false,
      CASE (i % 3)
        WHEN 0 THEN 'New York'
        WHEN 1 THEN 'Los Angeles'
        ELSE 'Chicago'
      END,
      CASE (i % 3)
        WHEN 0 THEN '10001'
        WHEN 1 THEN '90001'
        ELSE '60601'
      END,
      CASE i
        WHEN 1 THEN 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=400'
        WHEN 2 THEN 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=400'
        WHEN 3 THEN 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'
        WHEN 4 THEN 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400'
        ELSE 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=400'
      END,
      true,
      now() + INTERVAL '1 day' * (CASE i WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 5 ELSE 7 END),
      'active',
      150 + (i * 50)
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.seed_auction_items() IS 'Seeds database with 5 mock auction items for testing';