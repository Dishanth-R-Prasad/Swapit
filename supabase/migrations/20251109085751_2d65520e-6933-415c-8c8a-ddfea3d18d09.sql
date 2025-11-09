-- Add estimated_value column to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS estimated_value numeric;

-- Add comment explaining the column
COMMENT ON COLUMN public.items.estimated_value IS 'AI-estimated value in local currency for fair trade matching';