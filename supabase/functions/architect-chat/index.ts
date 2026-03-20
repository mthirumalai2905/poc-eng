import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const encoder = new TextEncoder();

function sseEvent(type: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) throw new Error("GROK_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ─── Phase 1: Load skills from DB ───
          controller.enqueue(sseEvent("status", { step: "Loading skills registry..." }));

          const { data: skills } = await supabase
            .from("skills")
            .select("id, name, description, category");

          controller.enqueue(sseEvent("status", { step: `Found ${(skills || []).length} skills` }));

          // Detect mentioned directories
          const dirKeywords = ["references", "scripts", "agents", "assets", "eval-viewer"];
          const mentionedDirs = dirKeywords.filter((d) =>
            userMessage.toLowerCase().includes(d)
          );

          const skillContextBlocks: string[] = [];

          for (const skill of skills || []) {
            controller.enqueue(sseEvent("status", { step: `Querying DB for ${skill.name} files...` }));

            // ─── Query skill_files table (DB-persisted metadata) ───
            const { data: dbFiles } = await supabase
              .from("skill_files")
              .select("file_path, file_name, is_folder, storage_path, file_type")
              .eq("skill_id", skill.id)
              .eq("is_folder", false);

            const allFiles = (dbFiles || []).map((f: any) => ({
              filePath: f.file_path as string,
              storagePath: f.storage_path as string,
              fileName: f.file_name as string,
            }));

            controller.enqueue(sseEvent("status", { step: `Found ${allFiles.length} files in DB for ${skill.name}` }));

            // Filter by mentioned dirs if user specified any
            let filesToRead = allFiles;
            if (mentionedDirs.length > 0) {
              filesToRead = allFiles.filter((f) => {
                if (f.filePath === "SKILL.md") return true;
                return mentionedDirs.some((d) => f.filePath.startsWith(d + "/") || f.filePath === d);
              });
              controller.enqueue(
                sseEvent("status", {
                  step: `Filtered to ${mentionedDirs.join(", ")} → ${filesToRead.length} files`,
                })
              );
            }

            // Prioritize key files
            const priorityPaths = ["SKILL.md", "references/", "agents/", "scripts/"];
            filesToRead.sort((a, b) => {
              const aP = priorityPaths.findIndex((p) => a.filePath.includes(p));
              const bP = priorityPaths.findIndex((p) => b.filePath.includes(p));
              return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
            });

            // Text-readable extensions
            const textExts = new Set(["md", "txt", "py", "js", "ts", "json", "yaml", "yml", "html", "css", "toml", "cfg", "ini", "sh"]);

            const capped = filesToRead.slice(0, 25);
            const fileContents: string[] = [];
            const fileList: string[] = [];

            // ─── Read actual file contents from storage ───
            for (const file of capped) {
              const ext = file.fileName.split(".").pop()?.toLowerCase() || "";
              if (!textExts.has(ext)) continue;

              controller.enqueue(sseEvent("status", { step: `Reading: ${skill.name}/${file.filePath}` }));

              try {
                const { data: fileData } = await supabase.storage
                  .from("skill-files")
                  .download(file.storagePath);

                if (fileData) {
                  const text = await fileData.text();
                  if (text.trim()) {
                    fileContents.push(
                      `#### File: ${file.filePath}\n\`\`\`\n${text.slice(0, 4000)}\n\`\`\``
                    );
                    fileList.push(file.filePath);
                  }
                }
              } catch {
                controller.enqueue(sseEvent("status", { step: `⚠ Could not read: ${file.filePath}` }));
              }
            }

            // Build context block
            let block = `### Skill: ${skill.name}\n**Category:** ${skill.category}\n**Description:** ${skill.description}`;

            if (fileContents.length > 0) {
              block += `\n\n**Files found in DB (${fileContents.length}):**\n${fileList.map((f) => `- ${f}`).join("\n")}`;
              block += `\n\n**File Contents:**\n${fileContents.join("\n\n")}`;
            } else {
              block += `\n\n**Files found:** NONE — no files exist in this skill's storage.`;
            }

            skillContextBlocks.push(block);
          }

          const skillRegistry = skillContextBlocks.join("\n\n---\n\n");

          controller.enqueue(sseEvent("status", { step: "Context assembled from DB + storage. Generating response..." }));

          // ─── Phase 2: System prompt ───
          const systemPrompt = `You are **Architect**, a strict RAG-only AI engineering agent.

## ABSOLUTE RULES
1. Your ONLY source of truth is the **file contents** retrieved from storage shown below.
2. You must NEVER reference files that are not listed in the retrieved contents.
3. You must NEVER invent, assume, or hallucinate file names, paths, or content.
4. If a directory is empty or has no files, say exactly: "No files found in [directory] for skill [name]."
5. If a file doesn't exist in storage, say: "File [name] does not exist in storage."
6. Do NOT use the skill's description or category to generate code — only use actual file contents.
7. Every statement must cite the exact source file: \`(source: actual-filename.ext)\`

## How to answer
- Look at the **File Contents** section below for each skill.
- ONLY use information that appears verbatim in those file contents.
- If the user asks about a directory (e.g., "references"), list ONLY the files that were actually found and read from the DB + storage.
- Do NOT list files from skill instructions or templates — only from the actual DB scan.

## Retrieved Context (from DB + Supabase Storage — dynamic, real-time)
${skillRegistry || "No skills or files found."}

## Response format
- Markdown with code blocks labeled with filenames.
- Cite source files for every claim.
- End with execution summary table:

| Field | Value |
|---|---|
| **Intent** | <what user asked> |
| **Skill** | <matched skill or None> |
| **Files Read** | <actual files read from DB + storage> |
| **Artifacts** | <generated outputs> |
| **Status** | ✅ / ⚠️ / ❌ |`;

          const llmResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROK_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
              stream: true,
            }),
          });

          if (!llmResponse.ok) {
            const errText = await llmResponse.text();
            console.error("Groq API error:", llmResponse.status, errText);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: `API error: ${llmResponse.status}` })}\n\n`)
            );
            controller.close();
            return;
          }

          const reader = llmResponse.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }

          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("architect-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
