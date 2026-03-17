import { Save } from "lucide-react";

type Props = {
  form: { name: string; description: string; instructions: string; category: string };
  setForm: (f: { name: string; description: string; instructions: string; category: string }) => void;
  isCreating: boolean;
  onSave: () => void;
  onCancel: () => void;
  categories: string[];
};

export default function SkillEditor({ form, setForm, isCreating, onSave, onCancel, categories }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., lambda-generator"
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of what this skill does..."
          rows={3}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Instructions (SKILL.md)</label>
        <textarea
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          placeholder="Detailed instructions for the AI when executing this skill..."
          rows={16}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
        />
      </div>
    </div>
  );
}
