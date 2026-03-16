import { useState } from "react";
import { Settings, Key, GitBranch, Database, Info } from "lucide-react";

export default function SettingsPage() {
  const [model, setModel] = useState("llama-3.3-70b-versatile");

  return (
    <div className="max-w-2xl mx-auto w-full p-6 space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System settings and integrations
        </p>
      </div>

      {/* LLM Configuration */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">LLM Engine</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Provider</label>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-2 rounded-md bg-secondary text-sm text-foreground border border-primary/30">
                Groq (Llama 3.3 70B)
              </div>
              <div className="px-3 py-2 rounded-md bg-secondary text-sm text-muted-foreground border border-border opacity-50">
                xAI (Grok) — Swap Ready
              </div>
              <div className="px-3 py-2 rounded-md bg-secondary text-sm text-muted-foreground border border-border opacity-50">
                Anthropic (Claude) — Swap Ready
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Default)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast)</option>
            </select>
          </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-md border border-primary/20">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              The orchestration layer is designed to be LLM-agnostic. Swap providers by updating the edge function configuration.
            </p>
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">API Keys</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">GROK_API_KEY</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success">Connected</span>
          </div>
        </div>
      </section>

      {/* GitHub */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Repository Integration</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">GitHub Connector</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">Not Connected</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Connect a GitHub repository to enable automatic branch creation, commits, and pull requests.
          </p>
        </div>
      </section>

      {/* Architecture */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Architecture</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Frontend</span>
              <p className="text-foreground font-mono text-xs mt-1">React + Vite + Tailwind</p>
            </div>
            <div>
              <span className="text-muted-foreground">Backend</span>
              <p className="text-foreground font-mono text-xs mt-1">Cloud Edge Functions</p>
            </div>
            <div>
              <span className="text-muted-foreground">Database</span>
              <p className="text-foreground font-mono text-xs mt-1">PostgreSQL (Cloud)</p>
            </div>
            <div>
              <span className="text-muted-foreground">LLM</span>
              <p className="text-foreground font-mono text-xs mt-1">xAI Grok API</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
