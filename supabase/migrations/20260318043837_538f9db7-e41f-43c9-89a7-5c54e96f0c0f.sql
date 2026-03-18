
-- Monitoring: execution traces for each prompt
CREATE TABLE public.monitoring_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  total_duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Monitoring: individual execution nodes within a trace
CREATE TABLE public.monitoring_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid NOT NULL REFERENCES public.monitoring_traces(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  node_type text NOT NULL,
  node_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  error_message text
);

-- Lifecycle: project sessions
CREATE TABLE public.lifecycle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  project_name text NOT NULL DEFAULT 'Untitled Project',
  current_state text NOT NULL DEFAULT 'CONTEXT_UPDATED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Lifecycle: state transitions log
CREATE TABLE public.lifecycle_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  from_state text NOT NULL,
  to_state text NOT NULL,
  triggered_by text DEFAULT 'system',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lifecycle: versioned artifacts
CREATE TABLE public.lifecycle_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  artifact_type text NOT NULL,
  file_path text NOT NULL,
  content text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- RLS policies
ALTER TABLE public.monitoring_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access monitoring_traces" ON public.monitoring_traces FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access monitoring_nodes" ON public.monitoring_nodes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access lifecycle_sessions" ON public.lifecycle_sessions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access lifecycle_transitions" ON public.lifecycle_transitions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access lifecycle_artifacts" ON public.lifecycle_artifacts FOR ALL TO public USING (true) WITH CHECK (true);

-- Trigger for lifecycle_sessions updated_at
CREATE TRIGGER update_lifecycle_sessions_updated_at
  BEFORE UPDATE ON public.lifecycle_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
