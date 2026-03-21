import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, Bot, User, FileText, CheckCircle2, PanelLeftClose, PanelLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/chat-stream";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatSessionsSidebar from "@/components/ChatSessionsSidebar";

type Msg = { role: "user" | "assistant"; content: string; id?: string };

const SUGGESTIONS = [
  "Generate an AWS Lambda function with SQS trigger and DLQ",
  "Design a schema for an e-commerce order system",
  "Create a Spark pipeline for user event aggregation",
  "Generate a bar chart from the schema references",
];

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsPanelOpen, setSessionsPanelOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusSteps]);

  // Load messages for a session
  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", sessionId)
      .order("created_at", { ascending: true });
    setMessages(
      (data || []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        id: m.id,
      }))
    );
  }, []);

  const createNewSession = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ title: "New Chat" })
      .select()
      .single();
    if (error || !data) { toast.error("Failed to create session"); return; }
    setActiveSessionId(data.id);
    setMessages([]);
  }, []);

  // Auto-create first session if none
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        loadSession(data[0].id);
      } else {
        createNewSession();
      }
    })();
  }, []);

  const handleSubmit = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const { data } = await supabase
        .from("chat_conversations")
        .insert({ title: messageText.slice(0, 60) })
        .select()
        .single();
      if (!data) { toast.error("Failed to create session"); return; }
      sessionId = data.id;
      setActiveSessionId(sessionId);
    }

    // Update conversation title on first message
    if (messages.length === 0) {
      await supabase
        .from("chat_conversations")
        .update({ title: messageText.slice(0, 60) })
        .eq("id", sessionId);
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: sessionId,
      role: "user",
      content: messageText,
    });

    const userMsg: Msg = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setIsRetrieving(true);
    setStatusSteps([]);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let assistantSoFar = "";
    let receivedFirstDelta = false;

    const upsertAssistant = (chunk: string) => {
      if (!receivedFirstDelta) {
        receivedFirstDelta = true;
        setIsRetrieving(false);
      }
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        conversationId: sessionId,
        onDelta: (chunk) => upsertAssistant(chunk),
        onStatus: (step) => setStatusSteps((prev) => [...prev, step]),
        onDone: async () => {
          setIsLoading(false);
          setIsRetrieving(false);
          setStatusSteps([]);
          // Save assistant message
          if (assistantSoFar && sessionId) {
            await supabase.from("chat_messages").insert({
              conversation_id: sessionId,
              role: "assistant",
              content: assistantSoFar,
            });
            await supabase
              .from("chat_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", sessionId);
          }
        },
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
          setIsRetrieving(false);
          setStatusSteps([]);
        },
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to get response");
      setIsLoading(false);
      setIsRetrieving(false);
      setStatusSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full">
      {/* Sessions sidebar */}
      <AnimatePresence initial={false}>
        {sessionsPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="border-r border-border flex-shrink-0 overflow-hidden"
          >
            <ChatSessionsSidebar
              activeSessionId={activeSessionId}
              onSelectSession={loadSession}
              onNewSession={createNewSession}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toggle sessions button */}
        <button
          onClick={() => setSessionsPanelOpen(!sessionsPanelOpen)}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title={sessionsPanelOpen ? "Hide sessions" : "Show sessions"}
        >
          {sessionsPanelOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center max-w-xl"
              >
                <div className="h-12 w-12 rounded-full border border-border flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-5 w-5 text-foreground" />
                </div>
                <h2 className="text-xl font-medium text-foreground mb-1 tracking-tight">Architect</h2>
                <p className="text-sm text-muted-foreground mb-10">
                  RAG-powered engineering assistant. Reads your skill files before answering.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + 0.08 * i, ease: "easeOut" }}
                      onClick={() => handleSubmit(s)}
                      className="text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-muted-foreground/20 transition-all text-xs text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-1">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="py-4"
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {msg.role === "user" ? (
                        <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-background" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        {msg.role === "user" ? "You" : "Architect"}
                      </p>
                      {msg.role === "assistant" ? (
                        <div className="prose-architect">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* File retrieval progress */}
              {isLoading && isRetrieving && statusSteps.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="py-4">
                  <div className="flex gap-3">
                    <div className="h-7 w-7 rounded-full border border-success/30 bg-success/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-success mb-2">Architect — reading files from storage</p>
                      <div className="space-y-1 font-mono">
                        {statusSteps.map((step, idx) => {
                          const isLatest = idx === statusSteps.length - 1;
                          const isFileRead = step.startsWith("Reading:");
                          const isWarning = step.startsWith("⚠");
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: isLatest ? 1 : 0.5, x: 0 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center gap-2 text-[11px]"
                            >
                              {isLatest ? (
                                <Loader2 className="h-3 w-3 animate-spin text-success flex-shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-success/50 flex-shrink-0" />
                              )}
                              {isFileRead && <FileText className="h-3 w-3 text-success/60 flex-shrink-0" />}
                              <span className={isWarning ? "text-yellow-500" : isLatest ? "text-success-foreground" : "text-success/40"}>
                                {step}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {isLoading && isRetrieving && statusSteps.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
                  <div className="flex gap-3">
                    <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky input */}
        <div className="sticky bottom-0 border-t border-border bg-background p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end bg-card border border-border rounded-xl focus-within:border-muted-foreground/30 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe an engineering task..."
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[44px] max-h-[200px]"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 200) + "px";
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                className="m-2 p-2 rounded-lg bg-foreground text-background disabled:opacity-20 hover:bg-foreground/90 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center tracking-wide">
              RAG Pipeline · Skill File Retrieval · Groq
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
