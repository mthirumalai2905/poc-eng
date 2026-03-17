import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Upload,
  Trash2,
  Pencil,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Download,
  X,
  Save,
  File,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const SKELETON_DIRS = [
  "agents",
  "assets",
  "eval-viewer",
  "references",
  "scripts",
];

const getFileIcon = (name: string) => {
  if (name.endsWith(".md")) return <FileText className="h-4 w-4 text-blue-400" />;
  if (name.endsWith(".py")) return <FileCode className="h-4 w-4 text-yellow-400" />;
  if (name.endsWith(".html")) return <FileCode className="h-4 w-4 text-orange-400" />;
  if (name.endsWith(".txt")) return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (name.endsWith(".json")) return <FileCode className="h-4 w-4 text-green-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

export default function SkillFileExplorer({ skillId, skillName }: Props) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ path: string; isFolder: boolean; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const [createName, setCreateName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState("");

  const basePath = `skills/${skillId}`;

  const fetchTree = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("skill-files").list(basePath, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      toast.error("Failed to load files");
      setLoading(false);
      return;
    }

    // Build tree by listing each known directory
    const rootFiles: FileNode[] = (data || [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => ({
        name: f.name,
        path: `${basePath}/${f.name}`,
        isFolder: !f.metadata || f.metadata.size === undefined || f.id === null,
      }));

    // For folders, recursively list their contents
    const enriched = await Promise.all(
      rootFiles.map(async (node) => {
        if (node.isFolder) {
          return await listDirRecursive(node.path, node.name);
        }
        return node;
      })
    );

    setTree(enriched);
    setLoading(false);
  };

  const listDirRecursive = async (path: string, name: string): Promise<FileNode> => {
    const { data } = await supabase.storage.from("skill-files").list(path, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

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
  };

  const scaffoldSkeleton = async () => {
    // Create placeholder files in each skeleton directory
    for (const dir of SKELETON_DIRS) {
      const placeholder = new Blob([""], { type: "text/plain" });
      await supabase.storage
        .from("skill-files")
        .upload(`${basePath}/${dir}/.emptyFolderPlaceholder`, placeholder, { upsert: true });
    }
    // Create a default SKILL.md
    const skillMd = new Blob(
      [`# ${skillName}\n\n## Description\n\nDescribe this skill...\n\n## Instructions\n\n1. Step one\n2. Step two\n`],
      { type: "text/markdown" }
    );
    await supabase.storage
      .from("skill-files")
      .upload(`${basePath}/SKILL.md`, skillMd, { upsert: true });

    const license = new Blob(["MIT License\n"], { type: "text/plain" });
    await supabase.storage
      .from("skill-files")
      .upload(`${basePath}/LICENSE.txt`, license, { upsert: true });

    await fetchTree();
    toast.success("Skill directory scaffolded");
  };

  useEffect(() => {
    fetchTree();
  }, [skillId]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const loadFileContent = async (path: string) => {
    setSelectedFile(path);
    setFileLoading(true);
    setEditMode(false);

    const { data, error } = await supabase.storage.from("skill-files").download(path);
    if (error) {
      toast.error("Failed to load file");
      setFileLoading(false);
      return;
    }
    const text = await data.text();
    setFileContent(text);
    setFileLoading(false);
  };

  const saveFileContent = async () => {
    if (!selectedFile) return;
    const blob = new Blob([fileContent], { type: "text/plain" });
    const { error } = await supabase.storage
      .from("skill-files")
      .update(selectedFile, blob, { upsert: true });
    if (error) {
      // If update fails, try upload
      const { error: upErr } = await supabase.storage
        .from("skill-files")
        .upload(selectedFile, blob, { upsert: true });
      if (upErr) {
        toast.error("Failed to save");
        return;
      }
    }
    toast.success("File saved");
    setEditMode(false);
  };

  const handleDelete = async (path: string, isFolder: boolean) => {
    if (isFolder) {
      // List and delete all files in the folder recursively
      const { data } = await supabase.storage.from("skill-files").list(path, { limit: 1000 });
      if (data && data.length > 0) {
        const paths = data.map((f) => `${path}/${f.name}`);
        await supabase.storage.from("skill-files").remove(paths);
      }
      // Also remove any nested
      toast.success("Folder deleted");
    } else {
      const { error } = await supabase.storage.from("skill-files").remove([path]);
      if (error) {
        toast.error("Failed to delete");
        return;
      }
      if (selectedFile === path) {
        setSelectedFile(null);
        setFileContent("");
      }
      toast.success("File deleted");
    }
    fetchTree();
    setContextMenu(null);
  };

  const handleRename = async (oldPath: string) => {
    if (!renameValue.trim()) return;
    const parts = oldPath.split("/");
    parts[parts.length - 1] = renameValue.trim();
    const newPath = parts.join("/");

    // Download then re-upload with new name
    const { data } = await supabase.storage.from("skill-files").download(oldPath);
    if (!data) {
      toast.error("Failed to rename");
      return;
    }
    await supabase.storage.from("skill-files").upload(newPath, data, { upsert: true });
    await supabase.storage.from("skill-files").remove([oldPath]);

    setRenaming(null);
    setRenameValue("");
    if (selectedFile === oldPath) setSelectedFile(newPath);
    fetchTree();
    toast.success("Renamed");
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const uploadPath = uploadTarget
        ? `${basePath}/${uploadTarget}/${file.name}`
        : `${basePath}/${file.name}`;
      const { error } = await supabase.storage
        .from("skill-files")
        .upload(uploadPath, file, { upsert: true });
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    toast.success("Upload complete");
    fetchTree();
  };

  const handleCreateNew = async () => {
    if (!createName.trim()) return;
    const parentPath = creatingIn ? `${basePath}/${creatingIn}` : basePath;
    if (createType === "folder") {
      const placeholder = new Blob([""], { type: "text/plain" });
      await supabase.storage
        .from("skill-files")
        .upload(`${parentPath}/${createName.trim()}/.emptyFolderPlaceholder`, placeholder);
    } else {
      const blob = new Blob([""], { type: "text/plain" });
      await supabase.storage
        .from("skill-files")
        .upload(`${parentPath}/${createName.trim()}`, blob);
    }
    toast.success(`${createType === "folder" ? "Folder" : "File"} created`);
    setCreatingIn(null);
    setCreateName("");
    fetchTree();
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFile === node.path;
    const isRenaming = renaming === node.path;
    const relativePath = node.path.replace(`${basePath}/`, "");

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-1 py-1 px-2 rounded-md text-sm cursor-pointer transition-colors group ${
            isSelected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isFolder) {
              toggleDir(node.path);
            } else {
              loadFileContent(node.path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ path: node.path, isFolder: node.isFolder, x: e.clientX, y: e.clientY });
          }}
        >
          {node.isFolder ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            )
          ) : (
            <span className="w-3.5 flex-shrink-0" />
          )}
          {node.isFolder ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-primary/70 flex-shrink-0" />
            )
          ) : (
            getFileIcon(node.name)
          )}

          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(node.path);
                if (e.key === "Escape") setRenaming(null);
              }}
              onBlur={() => setRenaming(null)}
              className="flex-1 bg-secondary border border-border rounded px-1 py-0.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate font-mono text-xs">{node.name}</span>
          )}

          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.isFolder && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadTarget(relativePath);
                    fileInputRef.current?.click();
                  }}
                  className="p-1 rounded hover:bg-primary/10"
                  title="Upload file"
                >
                  <Upload className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatingIn(relativePath);
                    setCreateType("file");
                    setCreateName("");
                  }}
                  className="p-1 rounded hover:bg-primary/10"
                  title="New file"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenaming(node.path);
                setRenameValue(node.name);
              }}
              className="p-1 rounded hover:bg-primary/10"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node.path, node.isFolder);
              }}
              className="p-1 rounded hover:bg-destructive/10 text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {node.isFolder && isExpanded && node.children && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {node.children.map((child) => renderNode(child, depth + 1))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* File tree panel */}
      <div className="w-64 border-r border-border flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setUploadTarget("");
                fileInputRef.current?.click();
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Upload to root"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setCreatingIn("");
                setCreateType("folder");
                setCreateName("");
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="New folder"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={fetchTree}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {creatingIn !== null && (
          <div className="p-2 border-b border-border bg-secondary/50 space-y-2">
            <div className="flex gap-1">
              <button
                onClick={() => setCreateType("file")}
                className={`px-2 py-0.5 rounded text-xs ${createType === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                File
              </button>
              <button
                onClick={() => setCreateType("folder")}
                className={`px-2 py-0.5 rounded text-xs ${createType === "folder" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Folder
              </button>
            </div>
            <div className="flex gap-1">
              <input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateNew();
                  if (e.key === "Escape") setCreatingIn(null);
                }}
                placeholder={createType === "folder" ? "folder-name" : "filename.ext"}
                className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
              />
              <button onClick={handleCreateNew} className="p-1 rounded bg-primary text-primary-foreground">
                <Plus className="h-3 w-3" />
              </button>
              <button onClick={() => setCreatingIn(null)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            {creatingIn && (
              <p className="text-xs text-muted-foreground">
                in: <span className="font-mono">{creatingIn || "root"}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-1">
          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-8">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-muted-foreground">No files yet</p>
              <button
                onClick={scaffoldSkeleton}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
              >
                Scaffold Directory
              </button>
            </div>
          ) : (
            tree.map((node) => renderNode(node, 0))
          )}
        </div>
      </div>

      {/* File content / editor panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground truncate">
                {selectedFile.replace(`${basePath}/`, "")}
              </span>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFileContent}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {fileLoading ? (
                <div className="text-xs text-muted-foreground text-center py-8">Loading file...</div>
              ) : editMode ? (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-secondary border border-border rounded-md p-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              ) : (
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a file to view or edit
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );
}
