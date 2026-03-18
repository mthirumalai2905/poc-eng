import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GitBranch, CheckCircle2, Clock, ArrowRight, RefreshCw, Loader2, Package, Eye, Merge, Rocket, FileCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STATES = [
  { key: "CONTEXT_UPDATED", label: "Context", icon: FileCode },
  { key: "ARTIFACT_GENERATED", label: "Generated", icon: Package },
  { key: "ORGANIZED", label: "Organized", icon: Package },
  { key: "READY_FOR_GITHUB", label: "Ready", icon: GitBranch },
  { key: "DEPLOYED_TO_GITHUB", label: "Deployed", icon: Rocket },
  { key: "PR_CREATED", label: "PR Created", icon: GitBranch },
  { key: "HUMAN_REVIEW", label: "Review", icon: Eye },
  { key: "MERGED", label: "Merged", icon: Merge },
];

type Session = {
  id: string;
  session_id: string;
  project_name: string;
  current_state: string;
  created_at: string;
  updated_at: string;
};

type Artifact = {
  id: string;
  session_id: string;
  artifact_type: string;
  file_path: string;
  version: number;
  status: string;
  created_at: string;
};

export default function LifecyclePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lifecycle_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    setSessions((data as any[]) || []);
    setLoading(false);
  };

  const fetchArtifacts = async (sessionId: string) => {
    const { data } = await supabase
      .from("lifecycle_artifacts")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    setArtifacts((data as any[]) || []);
  };

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => {
    if (selectedSession) {
      const s = sessions.find(s => s.id === selectedSession);
      if (s) fetchArtifacts(s.session_id);
    }
  }, [selectedSession]);

  const getStateIndex = (state: string) => STATES.findIndex(s => s.key === state);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-4 w-4 text-foreground" />
          <h1 className="text-sm font-medium text-foreground tracking-tight">Lifecycle</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {sessions.length} sessions
          </span>
        </div>
        <button onClick={fetchSessions} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sessions list */}
        <div className="w-72 border-r border-border overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No lifecycle sessions yet.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Sessions are created when artifacts are generated.</p>
            </div>
          ) : (
            sessions.map((s) => {
              const stateIdx = getStateIndex(s.current_state);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent transition-colors ${
                    selectedSession === s.id ? "bg-accent" : ""
                  }`}
                >
                  <p className="text-xs font-medium text-foreground truncate">{s.project_name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {s.current_state}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(s.updated_at).toLocaleString()}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Pipeline view */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedSession ? (
            <div className="flex flex-col items-center justify-center h-full">
              <GitBranch className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">Select a session to view pipeline</p>
            </div>
          ) : (() => {
            const session = sessions.find(s => s.id === selectedSession);
            if (!session) return null;
            const currentIdx = getStateIndex(session.current_state);

            return (
              <div>
                {/* Pipeline stages */}
                <h2 className="text-xs font-medium text-muted-foreground mb-6 tracking-wide uppercase">Pipeline Progress</h2>
                <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
                  {STATES.map((state, idx) => {
                    const Icon = state.icon;
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={state.key} className="flex items-center">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex flex-col items-center min-w-[80px] ${
                            isCurrent ? "" : isCompleted ? "opacity-100" : "opacity-30"
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${
                            isCompleted
                              ? "bg-foreground border-foreground"
                              : isCurrent
                                ? "border-foreground bg-accent"
                                : "border-border bg-card"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-background" />
                            ) : (
                              <Icon className={`h-3.5 w-3.5 ${isCurrent ? "text-foreground" : "text-muted-foreground"}`} />
                            )}
                          </div>
                          <span className={`text-[10px] mt-1.5 text-center ${
                            isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}>
                            {state.label}
                          </span>
                        </motion.div>
                        {idx < STATES.length - 1 && (
                          <div className={`w-6 h-px ${idx < currentIdx ? "bg-foreground" : "bg-border"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Artifacts */}
                <h2 className="text-xs font-medium text-muted-foreground mb-4 tracking-wide uppercase">Artifacts</h2>
                {artifacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No artifacts generated yet.</p>
                ) : (
                  <div className="space-y-2">
                    {artifacts.map((a) => (
                      <div key={a.id} className="border border-border rounded-lg p-3 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-mono text-foreground">{a.file_path}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">v{a.version}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{a.artifact_type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
