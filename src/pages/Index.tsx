import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Blocks, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/chat-stream";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Generate an AWS Lambda function with SQS trigger and DLQ",
  "Design a schema for an e-commerce order system",
  "Create a Spark pipeline for user event aggregation",
  "Add monitoring instrumentation to a Python service",
];

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Msg = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
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
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to get response");
      setIsLoading(false);
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
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl"
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Architect
              </h2>
              <p className="text-muted-foreground mb-8">
                AI-powered engineering assistant. Generate production-ready code,
                schemas, and pipelines using modular skills.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    onClick={() => handleSubmit(s)}
                    className="text-left p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose-architect text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Reasoning...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-card border border-border rounded-xl focus-within:border-primary/50 focus-within:glow-indigo transition-all">
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
              className="m-2 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by Groq · Skills-based orchestration
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
