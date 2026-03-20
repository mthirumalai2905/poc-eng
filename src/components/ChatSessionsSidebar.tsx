import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Session = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
};

const MAX_SESSIONS = 10;
const EXPIRY_DAYS = 10;

export default function ChatSessionsSidebar({ activeSessionId, onSelectSession, onNewSession }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    // Clean expired sessions first
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);
    await supabase.from("chat_conversations").delete().lt("created_at", cutoff.toISOString());

    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(MAX_SESSIONS);
    setSessions((data as Session[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);
  // Refresh when active session changes
  useEffect(() => { if (activeSessionId) fetchSessions(); }, [activeSessionId]);

  const handleNew = async () => {
    // If at limit, delete oldest
    if (sessions.length >= MAX_SESSIONS) {
      const oldest = sessions[sessions.length - 1];
      await supabase.from("chat_messages").delete().eq("conversation_id", oldest.id);
      await supabase.from("chat_conversations").delete().eq("id", oldest.id);
    }
    onNewSession();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("chat_conversations").delete().eq("id", id);
    fetchSessions();
    if (activeSessionId === id) onNewSession();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Sessions</span>
        <button
          onClick={handleNew}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="New session"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[11px] text-muted-foreground">No sessions yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map((s) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                onClick={() => onSelectSession(s.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors group ${
                  activeSessionId === s.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs truncate flex-1">{s.title || "New Chat"}</span>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          {sessions.length}/{MAX_SESSIONS} · {EXPIRY_DAYS}d retention
        </p>
      </div>
    </div>
  );
}
