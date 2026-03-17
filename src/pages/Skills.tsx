import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Blocks, Search, Save, ChevronLeft, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_SKILLS } from "@/lib/skills-data";
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
  const [activeTab, setActiveTab] = useState<"edit" | "files">("edit");
  const [listCollapsed, setListCollapsed] = useState(false);

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
    if (!form.name || !form.description || !form.instructions) { toast.error("All fields required"); return; }
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
    toast.success("Deleted");
    if (editingSkill?.id === id) { setEditingSkill(null); }
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
    setListCollapsed(false);
  };

  const cancelEdit = () => {
    setEditingSkill(null);
    setIsCreating(false);
    setListCollapsed(false);
  };

  const filtered = skills.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "all" || s.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const showPanel = isCreating || editingSkill;
  const isFilesTab = activeTab === "files" && editingSkill;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Skills list — collapsible */}
      <AnimatePresence initial={false}>
        {!(isFilesTab && listCollapsed) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: showPanel ? (isFilesTab ? 220 : "33%") : "100%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="flex flex-col border-r border-border overflow-hidden flex-shrink-0"
            style={{ minWidth: showPanel ? (isFilesTab ? 220 : 260) : "auto" }}
          >
            <div className="p-3 border-b border-border space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Blocks className="h-4 w-4 text-primary" />
                  Skills
                </h1>
                <button onClick={startCreate} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-secondary border border-border rounded-md pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              </div>
              {!isFilesTab && (
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2 py-0.5 rounded text-[11px] transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="text-center text-muted-foreground text-xs py-12">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-12">No skills found</div>
              ) : (
                filtered.map((skill) => (
                  <div
                    key={skill.id}
                    className={`px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                      editingSkill?.id === skill.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-card"
                    }`}
                    onClick={() => startEdit(skill)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-medium text-foreground font-mono truncate">{skill.name}</h3>
                          {!isFilesTab && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">{skill.category}</span>}
                        </div>
                        {!isFilesTab && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{skill.description}</p>}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(skill.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor / Files panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-w-0"
          >
            {/* Tab bar */}
            <div className="h-10 border-b border-border flex items-center justify-between px-3 flex-shrink-0 bg-card/30">
              <div className="flex items-center gap-1">
                {isFilesTab && listCollapsed && (
                  <button onClick={() => setListCollapsed(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground mr-1" title="Show skills list">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setActiveTab("edit"); setListCollapsed(false); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "edit" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Edit Skill
                </button>
                {editingSkill && (
                  <button
                    onClick={() => { setActiveTab("files"); setListCollapsed(true); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === "files" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <FolderOpen className="h-3 w-3" />
                    Files & References
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={cancelEdit} className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">Cancel</button>
                {activeTab === "edit" && (
                  <button onClick={isCreating ? handleCreate : handleUpdate} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
                    <Save className="h-3 w-3" />
                    {isCreating ? "Create" : "Save"}
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {activeTab === "edit" ? (
              <SkillEditor form={form} setForm={setForm} isCreating={isCreating} onSave={isCreating ? handleCreate : handleUpdate} onCancel={cancelEdit} categories={CATEGORIES.filter((c) => c !== "all")} />
            ) : editingSkill ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <SkillFileExplorer skillId={editingSkill.id} skillName={editingSkill.name} />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
