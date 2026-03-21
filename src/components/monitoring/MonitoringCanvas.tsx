import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw,
  ChevronRight, ZoomIn, ZoomOut, X, FileText, Cpu, Search,
  BookOpen, Layers, Zap, Shield, GitBranch,
} from "lucide-react";
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

const NODE_TYPE_ICONS: Record<string, typeof Activity> = {
  intent_detection: Search,
  skill_selection: BookOpen,
  reference_loading: FileText,
  context_assembly: Layers,
  execution_plan: GitBranch,
  artifact_generation: Cpu,
  validation: Shield,
  external_execution: Zap,
};

const statusColor = (status: string) => {
  switch (status) {
    case "completed": return "var(--success)";
    case "running": return "var(--foreground)";
    case "error": return "var(--destructive)";
    default: return "var(--muted-foreground)";
  }
};

const NODE_W = 200;
const NODE_H = 80;
const GAP = 56;

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
  const [searchTerm, setSearchTerm] = useState("");

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
      setPan({ x: 40, y: 40 });
    }
  }, [selectedTrace]);

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel("monitoring-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "monitoring_traces" }, () => {
        fetchTraces();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "monitoring_nodes" }, () => {
        if (selectedTrace) fetchNodes(selectedTrace);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTrace]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);
  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  // Group traces by conversation
  const filteredTraces = searchTerm
    ? traces.filter(t =>
        t.id.includes(searchTerm) ||
        t.session_id.includes(searchTerm) ||
        (t.metadata?.user_prompt || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : traces;

  const grouped = filteredTraces.reduce<Record<string, Trace[]>>((acc, t) => {
    const key = t.conversation_id || t.session_id;
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  const selectedTraceData = traces.find(t => t.id === selectedTrace);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header bar */}
      <div className="border-b border-border px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Execution Monitor</h1>
            <p className="text-[10px] text-muted-foreground">{traces.length} traces captured</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="p-1.5 rounded-md hover:bg-accent transition-colors border border-transparent hover:border-border">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="p-1.5 rounded-md hover:bg-accent transition-colors border border-transparent hover:border-border">
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={fetchTraces} className="p-1.5 rounded-md hover:bg-accent transition-colors border border-transparent hover:border-border">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Trace list sidebar */}
        <div className="w-72 border-r border-border flex flex-col flex-shrink-0">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-2.5 py-1.5">
              <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search traces..."
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="p-6 text-center">
                <Activity className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No traces yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">Send a chat message to generate traces</p>
              </div>
            ) : (
              Object.entries(grouped).map(([convId, convTraces]) => (
                <div key={convId} className="border-b border-border/50">
                  <div className="px-3 py-1.5 bg-card/20 sticky top-0">
                    <span className="text-[10px] font-mono text-muted-foreground/70 truncate block">
                      {convId.slice(0, 16)}…
                    </span>
                  </div>
                  {convTraces.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTrace(t.id)}
                      className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
                        selectedTrace === t.id
                          ? "bg-accent border-l-foreground"
                          : "border-l-transparent hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={t.status} />
                          <span className="text-[11px] font-mono text-foreground">
                            {t.id.slice(0, 8)}
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                      {t.metadata?.user_prompt && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {(t.metadata.user_prompt as string).slice(0, 50)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground/60">
                          {new Date(t.created_at).toLocaleTimeString()}
                        </span>
                        {t.total_duration_ms != null && (
                          <span className="text-[9px] font-mono text-muted-foreground/60 bg-secondary px-1 rounded">
                            {t.total_duration_ms}ms
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex min-w-0">
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Dot grid */}
            <div className="absolute inset-0 canvas-bg" style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
            }} />

            {!selectedTrace ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-2xl border border-dashed border-border flex items-center justify-center mb-4">
                  <Activity className="h-6 w-6 text-muted-foreground/15" />
                </div>
                <p className="text-xs text-muted-foreground">Select a trace to visualize execution graph</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Each node represents an AI reasoning step</p>
              </div>
            ) : (
              <>
                {/* Prompt banner */}
                {selectedTraceData?.metadata?.user_prompt && (
                  <div className="absolute top-3 left-3 right-3 z-10">
                    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 max-w-lg">
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">User Prompt</p>
                      <p className="text-xs text-foreground truncate">{selectedTraceData.metadata.user_prompt}</p>
                    </div>
                  </div>
                )}

                <div
                  className="absolute"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y + 60}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                  }}
                >
                  {/* SVG connectors */}
                  <svg
                    className="absolute top-0 left-0 pointer-events-none"
                    width={(nodes.length + 1) * (NODE_W + GAP)}
                    height={NODE_H + 100}
                    style={{ overflow: "visible" }}
                  >
                    {nodes.map((node, idx) => {
                      if (idx === 0) return null;
                      const x1 = (idx - 1) * (NODE_W + GAP) + NODE_W;
                      const y1 = NODE_H / 2;
                      const x2 = idx * (NODE_W + GAP);
                      const y2 = NODE_H / 2;
                      const midX = (x1 + x2) / 2;
                      const isError = node.status === "error";
                      return (
                        <g key={`conn-${idx}`}>
                          <path
                            d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                            stroke={isError ? "hsl(var(--destructive))" : node.status === "completed" ? "hsl(var(--success))" : "hsl(var(--border))"}
                            strokeWidth={2}
                            fill="none"
                            strokeDasharray={node.status === "running" ? "6 3" : undefined}
                            opacity={0.6}
                          />
                          {/* Arrow head */}
                          <circle cx={x2} cy={y2} r={3} fill={isError ? "hsl(var(--destructive))" : node.status === "completed" ? "hsl(var(--success))" : "hsl(var(--border))"} opacity={0.6} />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Node cards */}
                  <AnimatePresence>
                    {nodes.map((node, idx) => {
                      const Icon = NODE_TYPE_ICONS[node.node_type] || Cpu;
                      const isActive = selectedNode?.id === node.id;
                      const isError = node.status === "error";
                      const isRunning = node.status === "running";
                      const isCompleted = node.status === "completed";

                      return (
                        <motion.div
                          key={node.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06, type: "spring", damping: 22 }}
                          className={`absolute rounded-xl border bg-card cursor-pointer transition-all duration-150 ${
                            isActive ? "border-foreground/30 shadow-lg shadow-foreground/5 ring-1 ring-foreground/10" : "border-border hover:border-muted-foreground/30 hover:shadow-md"
                          } ${
                            isError ? "border-destructive/30 bg-destructive/5" :
                            isRunning ? "border-foreground/20 shadow-sm shadow-foreground/5" : ""
                          }`}
                          style={{
                            left: idx * (NODE_W + GAP),
                            top: 0,
                            width: NODE_W,
                            height: NODE_H,
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                        >
                          <div className="p-3 h-full flex flex-col justify-between">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                                  isCompleted ? "bg-success/10" : isError ? "bg-destructive/10" : isRunning ? "bg-foreground/10" : "bg-muted"
                                }`}>
                                  {isRunning ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-foreground" />
                                  ) : (
                                    <Icon className={`h-3 w-3 ${isCompleted ? "text-success" : isError ? "text-destructive" : "text-muted-foreground"}`} />
                                  )}
                                </div>
                                <span className="text-[11px] font-medium text-foreground truncate max-w-[110px]">
                                  {node.node_label}
                                </span>
                              </div>
                              <StatusDot status={node.status} />
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[9px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">
                                {node.node_type}
                              </span>
                              {node.duration_ms != null && (
                                <span className="text-[9px] font-mono text-muted-foreground/60">{node.duration_ms}ms</span>
                              )}
                            </div>
                          </div>
                          {isError && node.error_message && (
                            <div className="absolute -bottom-6 left-0 right-0 text-center">
                              <span className="text-[8px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                                {node.error_message.slice(0, 40)}…
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                className="border-l border-border overflow-hidden flex-shrink-0 bg-card/50 backdrop-blur-sm"
              >
                <div className="h-full overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = NODE_TYPE_ICONS[selectedNode.node_type] || Cpu;
                          return <Icon className="h-4 w-4 text-foreground" />;
                        })()}
                        <h3 className="text-xs font-semibold text-foreground">{selectedNode.node_label}</h3>
                      </div>
                      <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-accent transition-colors">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Status badge */}
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
                      selectedNode.status === "completed" ? "bg-success/10 text-success" :
                      selectedNode.status === "error" ? "bg-destructive/10 text-destructive" :
                      selectedNode.status === "running" ? "bg-foreground/10 text-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <StatusDot status={selectedNode.status} />
                      {selectedNode.status}
                    </div>

                    {/* Metadata grid */}
                    <div className="space-y-1.5">
                      <DetailRow label="Type" value={selectedNode.node_type} />
                      <DetailRow label="Step" value={`#${selectedNode.step_order}`} />
                      {selectedNode.duration_ms != null && <DetailRow label="Duration" value={`${selectedNode.duration_ms}ms`} />}
                      {selectedNode.started_at && <DetailRow label="Started" value={new Date(selectedNode.started_at).toLocaleTimeString()} />}
                      {selectedNode.completed_at && <DetailRow label="Completed" value={new Date(selectedNode.completed_at).toLocaleTimeString()} />}
                    </div>

                    {/* Error */}
                    {selectedNode.error_message && (
                      <div>
                        <span className="text-[10px] font-medium text-destructive uppercase tracking-wider">Error</span>
                        <div className="mt-1 bg-destructive/5 border border-destructive/20 rounded-md p-2">
                          <p className="text-[10px] font-mono text-destructive/80 break-all">{selectedNode.error_message}</p>
                        </div>
                      </div>
                    )}

                    {/* Input data */}
                    {selectedNode.input_data && Object.keys(selectedNode.input_data).length > 0 && (
                      <CollapsibleJson title="Input Data" data={selectedNode.input_data} />
                    )}

                    {/* Output data */}
                    {selectedNode.output_data && Object.keys(selectedNode.output_data).length > 0 && (
                      <CollapsibleJson title="Output Data" data={selectedNode.output_data} />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${
      status === "completed" ? "bg-success" :
      status === "error" ? "bg-destructive" :
      status === "running" ? "bg-foreground animate-pulse" :
      "bg-muted-foreground/30"
    }`} />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/30">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono text-foreground">{value}</span>
    </div>
  );
}

function CollapsibleJson({ title, data }: { title: string; data: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors flex items-center gap-1"
      >
        <ChevronRight className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-90" : ""}`} />
        {title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-[10px] font-mono text-muted-foreground mt-1 bg-secondary/50 border border-border/30 p-2 rounded-md overflow-x-auto max-h-48 overflow-y-auto"
          >
            {JSON.stringify(data, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}
