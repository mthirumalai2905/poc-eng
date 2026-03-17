import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Blocks, Search, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_SKILLS } from "@/lib/skills-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SkillEditor from "@/components/skills/SkillEditor";
import SkillFileExplorer from "@/components/skills/SkillFileExplorer";

type Skill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  category: string;
  references_docs: any;
  templates: any;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ["all", "serverless", "data-engineering", "data-modeling", "observability", "general"];

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", instructions: "", category: "general" });
  const [activeTab, setActiveTab] = useState("edit");

  const fetchSkills = async () => {
    const { data, error } = await supabase.from("skills").select("*").order("name");
    if (error) { toast.error("Failed to load skills"); return; }
    setSkills(data || []);
    setLoading(false);
  };

  const seedDefaults = async () => {
    const { data: existing } = await supabase.from("skills").select("name");
    const existingNames = new Set(existing?.map((s) => s.name));
    const toInsert = DEFAULT_SKILLS.filter((s) => !existingNames.has(s.name));
    if (toInsert.length > 0) await supabase.from("skills").insert(toInsert);
    fetchSkills();
  };

  useEffect(() => { seedDefaults(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.description || !form.instructions) { toast.error("All fields are required"); return; }
    const { error } = await supabase.from("skills").insert({ name: form.name, description: form.description, instructions: form.instructions, category: form.category });
    if (error) { toast.error(error.message); return; }
    toast.success("Skill created");
    setForm({ name: "", description: "", instructions: "", category: "general" });
    setIsCreating(false);
    fetchSkills();
  };

  const handleUpdate = async () => {
    if (!editingSkill) return;
    const { error } = await supabase.from("skills").update({ name: form.name, description: form.description, instructions: form.instructions, category: form.category }).eq("id", editingSkill.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Skill updated");
    setEditingSkill(null);
    fetchSkills();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Skill deleted");
    fetchSkills();
  };

  const startEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({ name: skill.name, description: skill.description, instructions: skill.instructions, category: skill.category });
    setIsCreating(false);
    setActiveTab("edit");
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingSkill(null);
    setForm({ name: "", description: "", instructions: "", category: "general" });
    setActiveTab("edit");
  };

  const cancelEdit = () => { setEditingSkill(null); setIsCreating(false); };

  const filtered = skills.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "all" || s.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const showEditor = isCreating || editingSkill;

  return (
    <div className="flex h-full">
      {/* Skills list */}
      <div className={`${showEditor ? "w-1/3 border-r border-border" : "w-full"} flex flex-col transition-all`}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Blocks className="h-5 w-5 text-primary" />
              Skills Registry
            </h1>
            <button onClick={startCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              New Skill
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills..." className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2.5 py-1 rounded-md text-xs transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading skills...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No skills found</div>
          ) : (
            filtered.map((skill) => (
              <motion.div key={skill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${editingSkill?.id === skill.id ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/20"}`}
                onClick={() => startEdit(skill)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground font-mono">{skill.name}</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{skill.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(skill); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(skill.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Editor / Files panel */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-4 pt-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between">
                    <TabsList className="bg-secondary">
                      <TabsTrigger value="edit" className="text-xs">Edit Skill</TabsTrigger>
                      {editingSkill && (
                        <TabsTrigger value="files" className="text-xs">Files & References</TabsTrigger>
                      )}
                    </TabsList>
                    <div className="flex gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">Cancel</button>
                      {activeTab === "edit" && (
                        <button onClick={isCreating ? handleCreate : handleUpdate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                          <Save className="h-3.5 w-3.5" />
                          {isCreating ? "Create" : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                </Tabs>
              </div>
            </div>

            {activeTab === "edit" ? (
              <SkillEditor
                form={form}
                setForm={setForm}
                isCreating={isCreating}
                onSave={isCreating ? handleCreate : handleUpdate}
                onCancel={cancelEdit}
                categories={CATEGORIES.filter((c) => c !== "all")}
              />
            ) : editingSkill ? (
              <div className="flex-1 min-h-0">
                <SkillFileExplorer skillId={editingSkill.id} skillName={editingSkill.name} />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
