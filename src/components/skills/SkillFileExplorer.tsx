import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, FileText, FileCode, Upload, Trash2, Pencil, Plus,
  ChevronRight, ChevronDown, File, RefreshCw, Save, X, FolderPlus, FilePlus,
  Download, Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SCAFFOLD_FILES } from "@/lib/skill-scaffold-templates";

type FileNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileNode[];
};

type Props = {
  skillId: string;
  skillName: string;
};

const getFileIcon = (name: string) => {
  if (name.endsWith(".md")) return <FileText className="h-3.5 w-3.5 text-primary/80" />;
  if (name.endsWith(".py")) return <FileCode className="h-3.5 w-3.5 text-accent" />;
  if (name.endsWith(".html")) return <FileCode className="h-3.5 w-3.5 text-destructive/70" />;
  if (name.endsWith(".json")) return <FileCode className="h-3.5 w-3.5 text-success" />;
  if (name.endsWith(".txt")) return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  return <File className="h-3.5 w-3.5 text-muted-foreground" />;
};

const getLanguage = (name: string) => {
  if (name.endsWith(".py")) return "python";
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".html")) return "html";
  if (name.endsWith(".json")) return "json";
  return "text";
};

export default function SkillFileExplorer({ skillId, skillName }: Props) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingIn, setCreatingIn] = useState<{ path: string; type: "file" | "folder" } | null>(null);
  const [createName, setCreateName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState("");
  const [scaffolding, setScaffolding] = useState(false);

  const basePath = `skills/${skillId}`;

  // Sync file tree to skill_files DB table for RAG retrieval
  const syncFilesToDB = useCallback(async (nodes: FileNode[]) => {
    const flatten = (items: FileNode[]): { file_path: string; file_name: string; is_folder: boolean; parent_path: string | null; storage_path: string; file_type: string | null }[] => {
      const result: { file_path: string; file_name: string; is_folder: boolean; parent_path: string | null; storage_path: string; file_type: string | null }[] = [];
      for (const node of items) {
        const relPath = node.path.replace(`${basePath}/`, "");
        const parentParts = relPath.split("/");
        parentParts.pop();
        const parentPath = parentParts.length > 0 ? parentParts.join("/") : null;
        const ext = node.name.includes(".") ? node.name.split(".").pop() || null : null;
        result.push({
          file_path: relPath,
          file_name: node.name,
          is_folder: node.isFolder,
          parent_path: parentPath,
          storage_path: node.path,
          file_type: ext,
        });
        if (node.isFolder && node.children) {
          result.push(...flatten(node.children));
        }
      }
      return result;
    };

    const rows = flatten(nodes);
    // Clear old entries for this skill, then insert fresh
    await supabase.from("skill_files").delete().eq("skill_id", skillId);
    if (rows.length > 0) {
      await supabase.from("skill_files").insert(
        rows.map((r) => ({ skill_id: skillId, ...r }))
      );
    }
  }, [basePath, skillId]);

  const listDirRecursive = useCallback(async (path: string, name: string): Promise<FileNode> => {
    const { data } = await supabase.storage.from("skill-files").list(path, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    const children: FileNode[] = [];
    for (const item of data || []) {
      if (item.name === ".emptyFolderPlaceholder") continue;
      const childPath = `${path}/${item.name}`;
      const isFolder = !item.metadata || item.metadata.size === undefined || item.id === null;
      if (isFolder) {
        children.push(await listDirRecursive(childPath, item.name));
      } else {
        children.push({ name: item.name, path: childPath, isFolder: false });
      }
    }
    return { name, path, isFolder: true, children };
  }, []);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("skill-files").list(basePath, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) { toast.error("Failed to load files"); setLoading(false); return; }

    const rootItems = (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    const nodes = await Promise.all(
      rootItems.map(async (f) => {
        const isFolder = !f.metadata || f.metadata.size === undefined || f.id === null;
        if (isFolder) return listDirRecursive(`${basePath}/${f.name}`, f.name);
        return { name: f.name, path: `${basePath}/${f.name}`, isFolder: false } as FileNode;
      })
    );
    setTree(nodes);
    // Sync to DB for RAG retrieval
    syncFilesToDB(nodes).catch(console.error);
    setLoading(false);
  }, [basePath, listDirRecursive, syncFilesToDB]);

  const scaffoldSkeleton = async () => {
    setScaffolding(true);
    try {
      for (const [relativePath, content] of Object.entries(SCAFFOLD_FILES)) {
        const fileContent = content.replace(/\{\{SKILL_NAME\}\}/g, skillName);
        const blob = new Blob([fileContent], { type: "text/plain" });
        await supabase.storage.from("skill-files").upload(`${basePath}/${relativePath}`, blob, { upsert: true });
      }
      // Ensure folder placeholders exist
      const dirs = ["agents", "assets", "eval-viewer", "references", "scripts"];
      for (const dir of dirs) {
        await supabase.storage.from("skill-files").upload(
          `${basePath}/${dir}/.emptyFolderPlaceholder`,
          new Blob([""]),
          { upsert: true }
        );
      }
      toast.success("Directory scaffolded with templates");
      // Auto-expand all folders
      setExpanded(new Set(dirs.map(d => `${basePath}/${d}`)));
      await fetchTree();
    } catch (e) {
      toast.error("Scaffold failed");
    }
    setScaffolding(false);
  };

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const loadFile = async (path: string) => {
    if (dirty && selectedFile) {
      if (!confirm("Unsaved changes will be lost. Continue?")) return;
    }
    setSelectedFile(path);
    setFileLoading(true);
    setEditMode(false);
    setDirty(false);
    const { data, error } = await supabase.storage.from("skill-files").download(path);
    if (error) { toast.error("Failed to load file"); setFileLoading(false); return; }
    setFileContent(await data.text());
    setFileLoading(false);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    const blob = new Blob([fileContent], { type: "text/plain" });
    const { error } = await supabase.storage.from("skill-files").update(selectedFile, blob, { upsert: true });
    if (error) {
      await supabase.storage.from("skill-files").upload(selectedFile, blob, { upsert: true });
    }
    toast.success("Saved");
    setDirty(false);
    setEditMode(false);
  };

  const handleDelete = async (path: string, isFolder: boolean) => {
    if (!confirm(`Delete ${path.split("/").pop()}?`)) return;
    if (isFolder) {
      const { data } = await supabase.storage.from("skill-files").list(path, { limit: 1000 });
      if (data?.length) {
        await supabase.storage.from("skill-files").remove(data.map((f) => `${path}/${f.name}`));
      }
    } else {
      await supabase.storage.from("skill-files").remove([path]);
      if (selectedFile === path) { setSelectedFile(null); setFileContent(""); }
    }
    toast.success("Deleted");
    fetchTree();
  };

  const handleRename = async (oldPath: string) => {
    if (!renameValue.trim()) return;
    const parts = oldPath.split("/");
    parts[parts.length - 1] = renameValue.trim();
    const newPath = parts.join("/");
    const { data } = await supabase.storage.from("skill-files").download(oldPath);
    if (!data) { toast.error("Rename failed"); return; }
    await supabase.storage.from("skill-files").upload(newPath, data, { upsert: true });
    await supabase.storage.from("skill-files").remove([oldPath]);
    setRenaming(null);
    if (selectedFile === oldPath) setSelectedFile(newPath);
    fetchTree();
    toast.success("Renamed");
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const path = uploadTarget ? `${basePath}/${uploadTarget}/${file.name}` : `${basePath}/${file.name}`;
      await supabase.storage.from("skill-files").upload(path, file, { upsert: true });
    }
    toast.success(`Uploaded ${files.length} file(s)`);
    fetchTree();
  };

  const handleCreate = async () => {
    if (!createName.trim() || !creatingIn) return;
    const parentPath = creatingIn.path ? `${basePath}/${creatingIn.path}` : basePath;
    if (creatingIn.type === "folder") {
      await supabase.storage.from("skill-files").upload(`${parentPath}/${createName.trim()}/.emptyFolderPlaceholder`, new Blob([""]));
    } else {
      await supabase.storage.from("skill-files").upload(`${parentPath}/${createName.trim()}`, new Blob([""]));
    }
    toast.success("Created");
    setCreatingIn(null);
    setCreateName("");
    fetchTree();
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExp = expanded.has(node.path);
    const isSel = selectedFile === node.path;
    const isRen = renaming === node.path;
    const relPath = node.path.replace(`${basePath}/`, "");

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-1.5 py-[5px] px-2 rounded-md text-xs cursor-pointer transition-all group ${
            isSel
              ? "bg-primary/10 text-foreground border-l-2 border-primary ml-[-2px]"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => node.isFolder ? toggleDir(node.path) : loadFile(node.path)}
        >
          {node.isFolder ? (
            isExp ? <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          ) : <span className="w-3 flex-shrink-0" />}

          {node.isFolder ? (
            isExp ? <FolderOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" /> : <Folder className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
          ) : getFileIcon(node.name)}

          {isRen ? (
            <input
              autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(node.path); if (e.key === "Escape") setRenaming(null); }}
              onBlur={() => setRenaming(null)}
              className="flex-1 bg-secondary border border-primary/30 rounded px-1.5 py-0.5 text-xs font-mono text-foreground focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate font-mono">{node.name}</span>
          )}

          {/* Hover actions */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.isFolder && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setUploadTarget(relPath); fileInputRef.current?.click(); }} className="p-0.5 rounded hover:bg-primary/10" title="Upload"><Upload className="h-3 w-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); setCreatingIn({ path: relPath, type: "file" }); setCreateName(""); }} className="p-0.5 rounded hover:bg-primary/10" title="New file"><FilePlus className="h-3 w-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); setCreatingIn({ path: relPath, type: "folder" }); setCreateName(""); }} className="p-0.5 rounded hover:bg-primary/10" title="New folder"><FolderPlus className="h-3 w-3" /></button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); setRenaming(node.path); setRenameValue(node.name); }} className="p-0.5 rounded hover:bg-primary/10" title="Rename"><Pencil className="h-3 w-3" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(node.path, node.isFolder); }} className="p-0.5 rounded hover:bg-destructive/10 text-destructive/70" title="Delete"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>

        {node.isFolder && isExp && node.children && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  const selectedFileName = selectedFile?.split("/").pop() || "";
  const lang = getLanguage(selectedFileName);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tree panel */}
      <div className="w-56 border-r border-border flex flex-col flex-shrink-0 bg-card/50">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Explorer</span>
          </div>
          <div className="flex gap-0.5">
            <button onClick={() => { setUploadTarget(""); fileInputRef.current?.click(); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Upload"><Upload className="h-3 w-3" /></button>
            <button onClick={() => { setCreatingIn({ path: "", type: "folder" }); setCreateName(""); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="New folder"><FolderPlus className="h-3 w-3" /></button>
            <button onClick={fetchTree} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Refresh"><RefreshCw className="h-3 w-3" /></button>
          </div>
        </div>

        {/* Create inline */}
        <AnimatePresence>
          {creatingIn && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-border overflow-hidden">
              <div className="p-2 space-y-1.5">
                <div className="flex gap-1">
                  <button onClick={() => setCreatingIn({ ...creatingIn, type: "file" })} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${creatingIn.type === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>File</button>
                  <button onClick={() => setCreatingIn({ ...creatingIn, type: "folder" })} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${creatingIn.type === "folder" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>Folder</button>
                </div>
                <div className="flex gap-1">
                  <input autoFocus value={createName} onChange={(e) => setCreateName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreatingIn(null); }} placeholder={creatingIn.type === "folder" ? "folder-name" : "file.ext"} className="flex-1 bg-secondary border border-border rounded px-1.5 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary/50" />
                  <button onClick={handleCreate} className="p-1 rounded bg-primary text-primary-foreground"><Plus className="h-3 w-3" /></button>
                  <button onClick={() => setCreatingIn(null)} className="p-1 rounded text-muted-foreground"><X className="h-3 w-3" /></button>
                </div>
                {creatingIn.path && <p className="text-[10px] text-muted-foreground font-mono">in /{creatingIn.path}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-1 px-0.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
              <span className="text-[11px] text-muted-foreground">Loading...</span>
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground text-center">No files yet. Scaffold the standard directory structure with templates.</p>
              <button onClick={scaffoldSkeleton} disabled={scaffolding} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {scaffolding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
                {scaffolding ? "Scaffolding..." : "Scaffold Directory"}
              </button>
            </div>
          ) : (
            tree.map((n) => renderNode(n, 0))
          )}
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {selectedFile ? (
          <>
            {/* Editor header */}
            <div className="h-10 px-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/30">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(selectedFileName)}
                <span className="text-xs font-mono text-muted-foreground truncate">{selectedFile.replace(`${basePath}/`, "")}</span>
                {dirty && <span className="h-2 w-2 rounded-full bg-warning flex-shrink-0" title="Unsaved" />}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wider">{lang}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {editMode ? (
                  <>
                    <button onClick={() => { setEditMode(false); setDirty(false); loadFile(selectedFile); }} className="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">Discard</button>
                    <button onClick={saveFile} className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      <Save className="h-3 w-3" />Save
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(true)} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Pencil className="h-3 w-3" />Edit
                  </button>
                )}
              </div>
            </div>

            {/* Editor body */}
            <div className="flex-1 overflow-auto">
              {fileLoading ? (
                <div className="flex items-center justify-center h-full"><RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" /></div>
              ) : editMode ? (
                <textarea
                  value={fileContent}
                  onChange={(e) => { setFileContent(e.target.value); setDirty(true); }}
                  className="w-full h-full bg-background px-4 py-3 text-xs font-mono text-foreground focus:outline-none resize-none leading-relaxed"
                  spellCheck={false}
                />
              ) : (
                <div className="px-4 py-3">
                  <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{fileContent}</pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
              <FileCode className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm">Select a file to view or edit</p>
            <p className="text-xs text-muted-foreground/60">Click any file in the explorer to open it here</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
    </div>
  );
}
