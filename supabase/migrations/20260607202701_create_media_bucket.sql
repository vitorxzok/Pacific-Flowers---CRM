-- Create the media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the media bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to the media bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'media');

-- Allow authenticated users to upload files to the media bucket
CREATE POLICY "Auth Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update files in the media bucket
CREATE POLICY "Auth Update Access" 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to delete files in the media bucket
CREATE POLICY "Auth Delete Access" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'media');