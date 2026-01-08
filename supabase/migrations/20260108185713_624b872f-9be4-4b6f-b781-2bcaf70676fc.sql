-- Create swaps table to track swap completions
CREATE TABLE public.swaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_user_id UUID NOT NULL,
  responder_user_id UUID NOT NULL,
  initiator_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  responder_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  initiator_confirmed BOOLEAN NOT NULL DEFAULT true,
  responder_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(initiator_user_id, responder_user_id, initiator_item_id, responder_item_id)
);

-- Enable RLS
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own swaps"
ON public.swaps
FOR SELECT
USING (auth.uid() = initiator_user_id OR auth.uid() = responder_user_id);

CREATE POLICY "Users can create swaps they initiate"
ON public.swaps
FOR INSERT
WITH CHECK (auth.uid() = initiator_user_id);

CREATE POLICY "Users can update swaps they're part of"
ON public.swaps
FOR UPDATE
USING (auth.uid() = initiator_user_id OR auth.uid() = responder_user_id);

-- Enable realtime for swaps
ALTER PUBLICATION supabase_realtime ADD TABLE public.swaps;

-- Function to complete swap and update items
CREATE OR REPLACE FUNCTION public.complete_swap(swap_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  swap_record swaps%ROWTYPE;
BEGIN
  SELECT * INTO swap_record FROM swaps WHERE id = swap_id;
  
  IF swap_record IS NULL THEN
    RAISE EXCEPTION 'Swap not found';
  END IF;
  
  IF NOT (swap_record.initiator_confirmed AND swap_record.responder_confirmed) THEN
    RAISE EXCEPTION 'Both users must confirm the swap';
  END IF;
  
  -- Update swap status
  UPDATE swaps SET status = 'completed', completed_at = now() WHERE id = swap_id;
  
  -- Update item statuses to swapped
  IF swap_record.initiator_item_id IS NOT NULL THEN
    UPDATE items SET status = 'swapped' WHERE id = swap_record.initiator_item_id;
  END IF;
  
  IF swap_record.responder_item_id IS NOT NULL THEN
    UPDATE items SET status = 'swapped' WHERE id = swap_record.responder_item_id;
  END IF;
  
  -- Remove from interests
  DELETE FROM interests WHERE item_id = swap_record.initiator_item_id OR item_id = swap_record.responder_item_id;
  
  -- Award swap credits to both users
  PERFORM add_swap_credit(swap_record.initiator_user_id);
  PERFORM add_swap_credit(swap_record.responder_user_id);
END;
$$;