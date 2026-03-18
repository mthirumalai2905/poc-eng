import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, Clock, AlertCircle, Loader2, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Trace = {
  id: string;
  session_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_duration_ms: number | null;
  metadata: any;
};

type Node = {
  id: string;
  trace_id: string;
  step_order: number;
  node_type: string;
  node_label: string;
  status: string;
  input_data: any;
  output_data: any;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
};

const NODE_TYPES = [
  { key: "intent_detection", label: "Intent Detection", icon: "🎯" },
  { key: "skill_selection", label: "Skill Selection", icon: "⚡" },
  { key: "context_retrieval", label: "Context Retrieval", icon: "📄" },
  { key: "planning", label: "Planning", icon: "📐" },
  { key: "generation", label: "Generation", icon: "🔧" },
  { key: "validation", label: "Validation", icon: "✅" },
];

const statusIcon = (status: string) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "running": return <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />;
    case "error": return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export default function MonitoringPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTraces = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("monitoring_traces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setTraces((data as any[]) || []);
    setLoading(false);
  };

  const fetchNodes = async (traceId: string) => {
    const { data } = await supabase
      .from("monitoring_nodes")
      .select("*")
      .eq("trace_id", traceId)
      .order("step_order", { ascending: true });
    setNodes((data as any[]) || []);
  };

  useEffect(() => { fetchTraces(); }, []);
  useEffect(() => { if (selectedTrace) fetchNodes(selectedTrace); }, [selectedTrace]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-foreground" />
          <h1 className="text-sm font-medium text-foreground tracking-tight">Monitoring</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {traces.length} traces
          </span>
        </div>
        <button onClick={fetchTraces} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Traces list */}
        <div className="w-80 border-r border-border overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : traces.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No traces yet.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Send a message in chat to generate a trace.</p>
            </div>
          ) : (
            traces.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTrace(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent transition-colors ${
                  selectedTrace === t.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(t.status)}
                    <span className="text-xs font-mono text-foreground truncate max-w-[140px]">
                      {t.session_id.slice(0, 12)}...
                    </span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </span>
                  {t.total_duration_ms && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {t.total_duration_ms}ms
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Node graph */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedTrace ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Activity className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">Select a trace to view execution nodes</p>
            </div>
          ) : (
            <div className="max-w-lg mx-auto">
              <h2 className="text-xs font-medium text-muted-foreground mb-6 tracking-wide uppercase">Execution Pipeline</h2>
              <div className="space-y-0">
                <AnimatePresence>
                  {NODE_TYPES.map((nt, idx) => {
                    const node = nodes.find(n => n.node_type === nt.key);
                    const isActive = !!node;
                    return (
                      <motion.div
                        key={nt.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                      >
                        {idx > 0 && (
                          <div className="flex justify-center">
                            <div className={`w-px h-6 ${isActive ? "bg-foreground/20" : "bg-border"}`} />
                          </div>
                        )}
                        <div className={`border rounded-lg p-3 transition-colors ${
                          isActive
                            ? node.status === "error"
                              ? "border-destructive/40 bg-destructive/5"
                              : node.status === "completed"
                                ? "border-border bg-card"
                                : "border-foreground/20 bg-accent"
                            : "border-border bg-card/50 opacity-40"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm">{nt.icon}</span>
                              <span className="text-xs font-medium text-foreground">{nt.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isActive && node.duration_ms && (
                                <span className="text-[10px] font-mono text-muted-foreground">{node.duration_ms}ms</span>
                              )}
                              {isActive ? statusIcon(node.status) : <Clock className="h-3 w-3 text-muted-foreground/40" />}
                            </div>
                          </div>
                          {isActive && node.error_message && (
                            <p className="text-[10px] text-destructive mt-2 font-mono">{node.error_message}</p>
                          )}
                          {isActive && node.output_data && Object.keys(node.output_data).length > 0 && (
                            <pre className="text-[10px] text-muted-foreground mt-2 bg-secondary p-2 rounded overflow-x-auto font-mono">
                              {JSON.stringify(node.output_data, null, 2).slice(0, 200)}
                            </pre>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
