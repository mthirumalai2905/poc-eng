import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Cpu, Key, Layers, Check } from "lucide-react";

const MODELS = [
  { provider: "Groq", model: "llama-3.3-70b-versatile" },
  { provider: "OpenAI", model: "gpt-4o" },
  { provider: "Anthropic", model: "claude-sonnet-4" },
];

export default function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-foreground" />
            <h1 className="text-sm font-medium text-foreground">Settings</h1>
          </div>
          <p className="text-xs text-muted-foreground">Configure the AI Lab environment.</p>
        </motion.div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-xs font-medium text-foreground uppercase tracking-wide">LLM Engine</h2>
          </div>
          <div className="space-y-2">
            {MODELS.map((m) => (
              <button
                key={m.model}
                onClick={() => setSelectedModel(m.model)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedModel === m.model
                    ? "border-foreground/30 bg-accent"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground">{m.model}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{m.provider}</span>
                  </div>
                  {selectedModel === m.model && <Check className="h-3.5 w-3.5 text-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-xs font-medium text-foreground uppercase tracking-wide">API Keys</h2>
          </div>
          <div className="space-y-2">
            {[
              { name: "GROK_API_KEY", status: "Connected" },
              { name: "GITHUB_TOKEN", status: "Connected" },
            ].map((k) => (
              <div key={k.name} className="px-4 py-3 rounded-lg border border-border bg-card flex items-center justify-between">
                <span className="text-xs font-mono text-foreground">{k.name}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                  {k.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-xs font-medium text-foreground uppercase tracking-wide">Architecture</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Frontend", value: "React + Vite" },
              { label: "Backend", value: "Edge Functions" },
              { label: "Database", value: "PostgreSQL" },
              { label: "Storage", value: "Cloud Storage" },
              { label: "Monitoring", value: "Trace Pipeline" },
              { label: "Lifecycle", value: "State Machine" },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3 rounded-lg border border-border bg-card">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-xs font-mono text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
