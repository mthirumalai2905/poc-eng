import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Loader2, RefreshCw,
  ChevronRight, ZoomIn, ZoomOut, X, FileText, Cpu, Search,
  BookOpen, Layers, Zap, Shield, GitBranch, Maximize2, Minimize2,
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

type NodePos = { x: number; y: number };

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

const NODE_W = 210;
const NODE_H = 84;
const GAP_X = 64;
const GAP_Y = 0;

function computePositions(nodes: Node[]): Record<string, NodePos> {
  const pos: Record<string, NodePos> = {};
  nodes.forEach((n, idx) => {
    pos[n.id] = { x: idx * (NODE_W + GAP_X), y: GAP_Y };
  });
  return pos;
}

export default function MonitoringCanvas() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 80 });
  const [nodePositions, setNodePositions] = useState<Record<string, NodePos>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const draggingNode = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

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
    const n = (data as Node[]) || [];
    setNodes(n);
    setNodePositions(computePositions(n));
  };

  useEffect(() => { fetchTraces(); }, []);
  useEffect(() => {
    if (selectedTrace) {
      fetchNodes(selectedTrace);
      setSelectedNode(null);
      setPan({ x: 60, y: 80 });
      setZoom(1);
    }
  }, [selectedTrace]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("monitoring-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "monitoring_traces" }, () => fetchTraces())
      .on("postgres_changes", { event: "*", schema: "public", table: "monitoring_nodes" }, () => {
        if (selectedTrace) fetchNodes(selectedTrace);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTrace]);

  // Canvas panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === canvasRef.current || target.classList.contains("canvas-bg")) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode.current) {
      const nodeId = draggingNode.current;
      const newX = (e.clientX - dragOffset.current.x - pan.x) / zoom;
      const newY = (e.clientY - dragOffset.current.y - pan.y) / zoom;
      setNodePositions(prev => ({ ...prev, [nodeId]: { x: newX, y: newY } }));
      return;
    }
    if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, [pan, zoom]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    draggingNode.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2.5, Math.max(0.2, z - e.deltaY * 0.001)));
  }, []);

  // Node dragging
  const startNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    draggingNode.current = nodeId;
    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    dragOffset.current = {
      x: e.clientX - (pos.x * zoom + pan.x),
      y: e.clientY - (pos.y * zoom + pan.y),
    };
  };

  // Fit to screen
  const fitToScreen = () => {
    if (nodes.length === 0) return;
    const totalW = nodes.length * (NODE_W + GAP_X);
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = (rect.width - 120) / totalW;
    const scaleY = (rect.height - 160) / (NODE_H + 40);
    const newZoom = Math.min(Math.max(scaleX, 0.3), 1.2);
    setZoom(newZoom);
    setPan({ x: 60, y: 80 });
    setNodePositions(computePositions(nodes));
  };

  // Toggle fullscreen
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Filter & group
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
    <div className={`flex flex-col bg-background transition-all duration-300 ${
      isFullscreen ? "fixed inset-0 z-50" : "h-full"
    }`}>
      {/* Header */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-foreground/5 border border-border flex items-center justify-center relative">
            <Activity className="h-3.5 w-3.5 text-foreground" />
            {/* Heartbeat glow */}
            <span className="absolute inset-0 rounded-md monitoring-heartbeat" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Execution Monitor</h1>
            <p className="text-[10px] text-muted-foreground">{traces.length} traces</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.15))} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={fitToScreen} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Fit to screen">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={fetchTraces} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-64 border-r border-border flex flex-col flex-shrink-0">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-2 py-1.5">
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
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="p-6 text-center">
                <Activity className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No traces yet</p>
              </div>
            ) : (
              Object.entries(grouped).map(([convId, convTraces]) => (
                <div key={convId} className="border-b border-border/40">
                  <div className="px-3 py-1 bg-card/20">
                    <span className="text-[9px] font-mono text-muted-foreground/50 truncate block">
                      {convId.slice(0, 14)}…
                    </span>
                  </div>
                  {convTraces.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTrace(t.id)}
                      className={`w-full text-left px-3 py-2 transition-colors border-l-2 ${
                        selectedTrace === t.id ? "bg-accent border-l-success" : "border-l-transparent hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <HealthDot status={t.status} />
                        <span className="text-[11px] font-mono text-foreground">{t.id.slice(0, 8)}</span>
                      </div>
                      {t.metadata?.user_prompt && (
                        <p className="text-[10px] text-muted-foreground truncate">{(t.metadata.user_prompt as string).slice(0, 45)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground/50">{new Date(t.created_at).toLocaleTimeString()}</span>
                        {t.total_duration_ms != null && (
                          <span className="text-[9px] font-mono text-muted-foreground/50">{t.total_duration_ms}ms</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
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
            onWheel={handleWheel}
          >
            {/* Grid */}
            <div className="absolute inset-0 canvas-bg" style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
            }} />

            {!selectedTrace ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="h-20 w-20 rounded-2xl border border-dashed border-border flex items-center justify-center mb-4 relative">
                  <Activity className="h-8 w-8 text-muted-foreground/10" />
                  <span className="absolute inset-0 rounded-2xl monitoring-heartbeat" />
                </div>
                <p className="text-xs text-muted-foreground">Select a trace to visualize execution graph</p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">Drag nodes to reposition · Scroll to zoom</p>
              </div>
            ) : (
              <>
                {/* Prompt banner */}
                {selectedTraceData?.metadata?.user_prompt && (
                  <div className="absolute top-3 left-3 z-10 max-w-md">
                    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
                      <p className="text-[9px] font-medium text-success uppercase tracking-wider mb-0.5">Prompt</p>
                      <p className="text-[11px] text-foreground line-clamp-2">{selectedTraceData.metadata.user_prompt}</p>
                    </div>
                  </div>
                )}

                {/* Transform layer */}
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
                    width={9999}
                    height={9999}
                    style={{ overflow: "visible" }}
                  >
                    <defs>
                      <filter id="glow-green">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="glow-red">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {nodes.map((node, idx) => {
                      if (idx === 0) return null;
                      const prev = nodes[idx - 1];
                      const p1 = nodePositions[prev.id] || { x: 0, y: 0 };
                      const p2 = nodePositions[node.id] || { x: 0, y: 0 };
                      const x1 = p1.x + NODE_W;
                      const y1 = p1.y + NODE_H / 2;
                      const x2 = p2.x;
                      const y2 = p2.y + NODE_H / 2;
                      const midX = (x1 + x2) / 2;
                      const isError = node.status === "error";
                      const isCompleted = node.status === "completed";
                      const color = isError ? "hsl(var(--destructive))" : isCompleted ? "hsl(var(--success))" : "hsl(var(--border))";
                      return (
                        <g key={`conn-${idx}`}>
                          <path
                            d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                            stroke={color}
                            strokeWidth={2}
                            fill="none"
                            strokeDasharray={node.status === "running" ? "6 3" : undefined}
                            opacity={0.5}
                            filter={isCompleted ? "url(#glow-green)" : isError ? "url(#glow-red)" : undefined}
                          />
                          <circle cx={x2 - 1} cy={y2} r={3} fill={color} opacity={0.7} />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Nodes */}
                  <AnimatePresence>
                    {nodes.map((node, idx) => {
                      const Icon = NODE_TYPE_ICONS[node.node_type] || Cpu;
                      const pos = nodePositions[node.id] || { x: 0, y: 0 };
                      const isActive = selectedNode?.id === node.id;
                      const isError = node.status === "error";
                      const isRunning = node.status === "running";
                      const isCompleted = node.status === "completed";

                      return (
                        <motion.div
                          key={node.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, type: "spring", damping: 20 }}
                          className={`absolute rounded-xl border bg-card select-none transition-shadow duration-200 ${
                            isActive ? "border-success/50 ring-1 ring-success/20" : "border-border hover:border-muted-foreground/30"
                          } ${isError ? "border-destructive/40" : ""}`}
                          style={{
                            left: pos.x,
                            top: pos.y,
                            width: NODE_W,
                            height: NODE_H,
                            cursor: draggingNode.current === node.id ? "grabbing" : "grab",
                          }}
                          onMouseDown={(e) => startNodeDrag(node.id, e)}
                          onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                        >
                          {/* Health glow ring for completed nodes */}
                          {isCompleted && (
                            <span className="absolute -inset-px rounded-xl monitoring-node-glow pointer-events-none" />
                          )}
                          {isError && (
                            <span className="absolute -inset-px rounded-xl monitoring-node-glow-error pointer-events-none" />
                          )}

                          <div className="p-3 h-full flex flex-col justify-between relative z-10">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                                  isCompleted ? "bg-success/15" : isError ? "bg-destructive/15" : isRunning ? "bg-foreground/10" : "bg-muted"
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
                              <HealthDot status={node.status} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded">
                                {node.node_type}
                              </span>
                              {node.duration_ms != null && (
                                <span className="text-[9px] font-mono text-muted-foreground/50">{node.duration_ms}ms</span>
                              )}
                            </div>
                          </div>
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
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                className="border-l border-border overflow-hidden flex-shrink-0 bg-card/50 backdrop-blur-sm"
              >
                <div className="h-full overflow-y-auto">
                  <div className="p-4 space-y-4">
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

                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
                      selectedNode.status === "completed" ? "bg-success/10 text-success" :
                      selectedNode.status === "error" ? "bg-destructive/10 text-destructive" :
                      selectedNode.status === "running" ? "bg-foreground/10 text-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <HealthDot status={selectedNode.status} />
                      {selectedNode.status}
                    </div>

                    <div className="space-y-1.5">
                      <DetailRow label="Type" value={selectedNode.node_type} />
                      <DetailRow label="Step" value={`#${selectedNode.step_order}`} />
                      {selectedNode.duration_ms != null && <DetailRow label="Duration" value={`${selectedNode.duration_ms}ms`} />}
                      {selectedNode.started_at && <DetailRow label="Started" value={new Date(selectedNode.started_at).toLocaleTimeString()} />}
                      {selectedNode.completed_at && <DetailRow label="Completed" value={new Date(selectedNode.completed_at).toLocaleTimeString()} />}
                    </div>

                    {selectedNode.error_message && (
                      <div>
                        <span className="text-[10px] font-medium text-destructive uppercase tracking-wider">Error</span>
                        <div className="mt-1 bg-destructive/5 border border-destructive/20 rounded-md p-2">
                          <p className="text-[10px] font-mono text-destructive/80 break-all">{selectedNode.error_message}</p>
                        </div>
                      </div>
                    )}

                    {selectedNode.input_data && Object.keys(selectedNode.input_data).length > 0 && (
                      <CollapsibleJson title="Input Data" data={selectedNode.input_data} />
                    )}
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

/* ─── Sub-components ─── */

function HealthDot({ status }: { status: string }) {
  const isCompleted = status === "completed";
  const isError = status === "error";
  const isRunning = status === "running";

  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {(isCompleted || isRunning) && (
        <span className={`absolute inset-0 rounded-full ${
          isCompleted ? "bg-success/40" : "bg-foreground/40"
        } animate-ping`} style={{ animationDuration: "2s" }} />
      )}
      {isError && (
        <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ping" style={{ animationDuration: "1.5s" }} />
      )}
      <span className={`relative inline-block h-2.5 w-2.5 rounded-full ${
        isCompleted ? "bg-success" :
        isError ? "bg-destructive" :
        isRunning ? "bg-foreground" :
        "bg-muted-foreground/30"
      }`} />
    </span>
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
