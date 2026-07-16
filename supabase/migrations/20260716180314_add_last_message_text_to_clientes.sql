ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS last_message_text text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS last_message_media_url text;
