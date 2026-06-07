ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS is_exported boolean DEFAULT false;
