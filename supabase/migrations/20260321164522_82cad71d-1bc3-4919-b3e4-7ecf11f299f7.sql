-- Enable realtime for monitoring tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_traces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_nodes;