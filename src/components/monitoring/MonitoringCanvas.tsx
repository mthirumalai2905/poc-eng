import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Trace = {
  id: string;
  session_id: string;
  conversation_id: string | null;
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

const statusColor = (status: string) => {
  switch (status) {
    case "completed": return "hsl(var(--success))";
    case "running": return "hsl(var(--foreground))";
    case "error": return "hsl(var(--destructive))";
    default: return "hsl(var(--muted-foreground))";
  }
};

const statusIcon = (status: string, size = "h-3.5 w-3.5") => {
  switch (status) {
    case "completed": return <CheckCircle2 className={`${size} text-success`} />;
    case "running": return <Loader2 className={`${size} animate-spin text-foreground`} />;
    case "error": return <AlertCircle className={`${size} text-destructive`} />;
    default: return <Clock className={`${size} text-muted-foreground`} />;
  }
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;
const GAP_X = 60;
const GAP_Y = 24;

export default function MonitoringCanvas() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const fetchTraces = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("monitoring_traces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setTraces((data as Trace[]) || []);
    setLoading(false);
  };

  const fetchNodes = async (traceId: string) => {
    const { data } = await supabase
      .from("monitoring_nodes")
      .select("*")
      .eq("trace_id", traceId)
      .order("step_order", { ascending: true });
    setNodes((data as Node[]) || []);
  };

  useEffect(() => { fetchTraces(); }, []);
  useEffect(() => {
    if (selectedTrace) {
      fetchNodes(selectedTrace);
      setSelectedNode(null);
    }
  }, [selectedTrace]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  // Group sessions by conversation_id
  const groupedByConversation = traces.reduce<Record<string, Trace[]>>((acc, t) => {
    const key = t.conversation_id || t.session_id;
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-foreground" />
          <h1 className="text-sm font-medium text-foreground tracking-tight">Monitoring</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {traces.length} traces
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="p-1.5 rounded hover:bg-accent transition-colors">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="p-1.5 rounded hover:bg-accent transition-colors">
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={fetchTraces} className="p-1.5 rounded hover:bg-accent transition-colors ml-2">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Session/trace list */}
        <div className="w-72 border-r border-border overflow-y-auto flex-shrink-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedByConversation).length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No traces yet.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Chat sessions will appear here.</p>
            </div>
          ) : (
            Object.entries(groupedByConversation).map(([convId, convTraces]) => (
              <div key={convId} className="border-b border-border">
                <div className="px-3 py-2 bg-card/30">
                  <span className="text-[10px] font-mono text-muted-foreground truncate block">
                    Session: {convId.slice(0, 12)}…
                  </span>
                </div>
                {convTraces.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrace(t.id)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-accent transition-colors ${
                      selectedTrace === t.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {statusIcon(t.status)}
                        <span className="text-xs font-mono text-foreground truncate max-w-[120px]">
                          Trace {t.id.slice(0, 8)}
                        </span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleTimeString()}
                      </span>
                      {t.total_duration_ms && (
                        <span className="text-[10px] font-mono text-muted-foreground">{t.total_duration_ms}ms</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex min-w-0">
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <div className="absolute inset-0 canvas-bg" style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
            }} />

            {!selectedTrace ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">Select a trace to view execution graph</p>
              </div>
            ) : (
              <div
                className="absolute"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                {/* SVG connectors */}
                <svg
                  className="absolute top-0 left-0 pointer-events-none"
                  width={nodes.length * (NODE_WIDTH + GAP_X)}
                  height={NODE_HEIGHT + GAP_Y * 2}
                  style={{ overflow: "visible" }}
                >
                  {nodes.map((node, idx) => {
                    if (idx === 0) return null;
                    const x1 = (idx - 1) * (NODE_WIDTH + GAP_X) + NODE_WIDTH;
                    const y1 = NODE_HEIGHT / 2;
                    const x2 = idx * (NODE_WIDTH + GAP_X);
                    const y2 = NODE_HEIGHT / 2;
                    const midX = (x1 + x2) / 2;
                    return (
                      <path
                        key={`conn-${idx}`}
                        d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                        stroke={statusColor(node.status)}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray={node.status === "running" ? "6 3" : undefined}
                        opacity={0.5}
                      />
                    );
                  })}
                </svg>

                {/* Node cards */}
                <AnimatePresence>
                  {nodes.map((node, idx) => (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: "spring", damping: 20 }}
                      className={`absolute rounded-lg border bg-card p-3 cursor-pointer transition-shadow hover:shadow-md ${
                        selectedNode?.id === node.id ? "border-foreground/40 shadow-lg ring-1 ring-foreground/10" : "border-border"
                      } ${
                        node.status === "error" ? "border-destructive/40 bg-destructive/5" :
                        node.status === "running" ? "border-foreground/20" : ""
                      }`}
                      style={{
                        left: idx * (NODE_WIDTH + GAP_X),
                        top: 0,
                        width: NODE_WIDTH,
                        height: NODE_HEIGHT,
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-foreground truncate">{node.node_label}</span>
                        {statusIcon(node.status, "h-3 w-3")}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{node.node_type}</span>
                        {node.duration_ms && <span className="text-[10px] font-mono text-muted-foreground">{node.duration_ms}ms</span>}
                      </div>
                      {node.error_message && (
                        <p className="text-[9px] text-destructive mt-1 truncate">{node.error_message}</p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Node detail panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                className="border-l border-border overflow-y-auto flex-shrink-0 bg-card/50"
              >
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-foreground">{selectedNode.node_label}</h3>
                    {statusIcon(selectedNode.status)}
                  </div>

                  <div className="space-y-2">
                    <DetailRow label="Type" value={selectedNode.node_type} />
                    <DetailRow label="Status" value={selectedNode.status} />
                    <DetailRow label="Step" value={String(selectedNode.step_order)} />
                    {selectedNode.duration_ms && <DetailRow label="Duration" value={`${selectedNode.duration_ms}ms`} />}
                    {selectedNode.started_at && <DetailRow label="Started" value={new Date(selectedNode.started_at).toLocaleTimeString()} />}
                    {selectedNode.error_message && (
                      <div>
                        <span className="text-[10px] text-destructive font-medium">Error</span>
                        <p className="text-[10px] font-mono text-destructive/80 mt-0.5 bg-destructive/5 p-2 rounded">{selectedNode.error_message}</p>
                      </div>
                    )}
                  </div>

                  {selectedNode.input_data && Object.keys(selectedNode.input_data).length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Input</span>
                      <pre className="text-[10px] font-mono text-muted-foreground mt-1 bg-secondary p-2 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(selectedNode.input_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedNode.output_data && Object.keys(selectedNode.output_data).length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Output</span>
                      <pre className="text-[10px] font-mono text-muted-foreground mt-1 bg-secondary p-2 rounded overflow-x-auto max-h-40">
                        {JSON.stringify(selectedNode.output_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono text-foreground">{value}</span>
    </div>
  );
}
