-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  item_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT messages_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create index for better query performance
CREATE INDEX messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX messages_recipient_id_idx ON public.messages(recipient_id);
CREATE INDEX messages_created_at_idx ON public.messages(created_at DESC);