-- Avatar Storage Setup
-- Enable storage for avatars and set up policies

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read avatars
CREATE POLICY "Public Read Avatars" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

-- 3. Allow authenticated users to upload their own avatars
-- We use a simple policy for the admin-dashboard context
CREATE POLICY "Admin Avatar Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

-- 4. Allow authenticated users to update/delete
CREATE POLICY "Admin Avatar Update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars');

CREATE POLICY "Admin Avatar Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars');
