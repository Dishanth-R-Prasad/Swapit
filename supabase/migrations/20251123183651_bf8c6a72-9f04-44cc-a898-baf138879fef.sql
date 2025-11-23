-- Create products table for catalog
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  price numeric NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  image_url text,
  description text,
  stock_quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view products (public catalog)
CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_sku ON public.products(sku);

-- Seed function for mock users
CREATE OR REPLACE FUNCTION public.seed_mock_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert 10 mock users into profiles
  INSERT INTO public.profiles (id, email, full_name, avatar_url, city, bio) VALUES
    (gen_random_uuid(), 'alice.smith@example.com', 'Alice Smith', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', 'New York', 'Passionate about sustainable living and swapping items.'),
    (gen_random_uuid(), 'bob.jones@example.com', 'Bob Jones', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', 'Los Angeles', 'Tech enthusiast looking to declutter.'),
    (gen_random_uuid(), 'carol.davis@example.com', 'Carol Davis', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', 'Chicago', 'Love finding treasures and swapping with others.'),
    (gen_random_uuid(), 'david.wilson@example.com', 'David Wilson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', 'Houston', 'Minimalist lifestyle advocate.'),
    (gen_random_uuid(), 'emma.brown@example.com', 'Emma Brown', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', 'Phoenix', 'Collector of vintage items and books.'),
    (gen_random_uuid(), 'frank.taylor@example.com', 'Frank Taylor', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank', 'Philadelphia', 'Sports gear enthusiast and trader.'),
    (gen_random_uuid(), 'grace.lee@example.com', 'Grace Lee', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace', 'San Antonio', 'Fashion lover and sustainability advocate.'),
    (gen_random_uuid(), 'henry.martin@example.com', 'Henry Martin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry', 'San Diego', 'Electronics hobbyist and maker.'),
    (gen_random_uuid(), 'iris.anderson@example.com', 'Iris Anderson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Iris', 'Dallas', 'Home decor enthusiast.'),
    (gen_random_uuid(), 'jack.thomas@example.com', 'Jack Thomas', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', 'Austin', 'Outdoor gear collector and swapper.')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Seed function for mock products
CREATE OR REPLACE FUNCTION public.seed_mock_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert 20 mock products
  INSERT INTO public.products (name, sku, price, category, image_url, description, stock_quantity) VALUES
    ('Wireless Bluetooth Headphones', 'TECH-001', 79.99, 'Electronics', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'High-quality wireless headphones with noise cancellation', 50),
    ('Smart Watch Fitness Tracker', 'TECH-002', 129.99, 'Electronics', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Track your fitness goals with style', 35),
    ('Portable Phone Charger', 'TECH-003', 29.99, 'Electronics', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400', '20000mAh fast charging power bank', 100),
    ('Vintage Denim Jacket', 'FASH-001', 59.99, 'Clothing', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 'Classic denim jacket in excellent condition', 20),
    ('Cotton T-Shirt Bundle', 'FASH-002', 39.99, 'Clothing', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Set of 3 premium cotton t-shirts', 60),
    ('Running Sneakers', 'FASH-003', 89.99, 'Clothing', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'Comfortable and stylish running shoes', 40),
    ('Yoga Mat Premium', 'SPORT-001', 49.99, 'Sports', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', 'Eco-friendly non-slip yoga mat', 75),
    ('Basketball Official Size', 'SPORT-002', 34.99, 'Sports', 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=400', 'Professional quality basketball', 45),
    ('Camping Tent 4-Person', 'SPORT-003', 149.99, 'Sports', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400', 'Waterproof camping tent for family adventures', 25),
    ('Classic Novel Collection', 'BOOK-001', 24.99, 'Books', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400', 'Set of 5 timeless classics', 80),
    ('Cookbook Mediterranean', 'BOOK-002', 19.99, 'Books', 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400', 'Delicious Mediterranean recipes', 50),
    ('Modern Office Chair', 'FURN-001', 199.99, 'Furniture', 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400', 'Ergonomic office chair with lumbar support', 30),
    ('Wooden Bookshelf', 'FURN-002', 129.99, 'Furniture', 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400', '5-tier wooden bookshelf for home or office', 15),
    ('Coffee Table Modern', 'FURN-003', 159.99, 'Furniture', 'https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400', 'Minimalist coffee table with storage', 20),
    ('Indoor Plant Potted', 'HOME-001', 29.99, 'Home & Garden', 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=400', 'Beautiful indoor plant in decorative pot', 100),
    ('LED Desk Lamp', 'HOME-002', 39.99, 'Home & Garden', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400', 'Adjustable LED lamp with USB charging port', 70),
    ('Kitchen Knife Set', 'HOME-003', 79.99, 'Home & Garden', 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400', 'Professional 6-piece knife set with block', 40),
    ('Mountain Bike 21-Speed', 'VEH-001', 399.99, 'Vehicles', 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400', 'Durable mountain bike for all terrains', 12),
    ('Electric Scooter', 'VEH-002', 299.99, 'Vehicles', 'https://images.unsplash.com/photo-1598134493341-e5ef74e8c2ab?w=400', 'Eco-friendly electric scooter for commuting', 18),
    ('Skateboard Complete', 'VEH-003', 79.99, 'Vehicles', 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=400', 'Ready-to-ride skateboard for beginners', 35)
  ON CONFLICT (sku) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.seed_mock_users() IS 'Seeds database with 10 mock users for testing';
COMMENT ON FUNCTION public.seed_mock_products() IS 'Seeds database with 20 mock products for testing';