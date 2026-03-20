
CREATE TABLE public.skill_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  is_folder boolean NOT NULL DEFAULT false,
  parent_path text,
  file_type text,
  file_size integer DEFAULT 0,
  content_hash text,
  storage_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(skill_id, file_path)
);

ALTER TABLE public.skill_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skill files are publicly accessible" ON public.skill_files FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_skill_files_updated_at BEFORE UPDATE ON public.skill_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
