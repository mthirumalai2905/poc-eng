
-- Create storage bucket for skill files
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-files', 'skill-files', true);

-- Allow anyone to read skill files
CREATE POLICY "Skill files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'skill-files');

-- Allow anyone to upload skill files
CREATE POLICY "Anyone can upload skill files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'skill-files');

-- Allow anyone to update skill files
CREATE POLICY "Anyone can update skill files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'skill-files');

-- Allow anyone to delete skill files
CREATE POLICY "Anyone can delete skill files"
ON storage.objects FOR DELETE
USING (bucket_id = 'skill-files');
