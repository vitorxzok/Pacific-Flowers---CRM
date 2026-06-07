CREATE TABLE IF NOT EXISTS public.webhook_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone DEFAULT now(), payload jsonb );
