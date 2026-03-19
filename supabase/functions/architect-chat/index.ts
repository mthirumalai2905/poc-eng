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
          // ─── Phase 1: Load skill metadata (only name/category/description) ───
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
            const skillDir = `${skill.id}/`;

            controller.enqueue(sseEvent("status", { step: `Scanning storage: ${skill.name}/` }));

            // ─── DYNAMIC: List ALL actual files from Supabase storage ───
            const allFiles = await listAllFiles(supabase, "skill-files", skillDir);

            controller.enqueue(sseEvent("status", { step: `Found ${allFiles.length} files in ${skill.name}/` }));

            // If user mentioned specific dirs, filter to ONLY those + SKILL.md
            let filesToRead = allFiles;
            if (mentionedDirs.length > 0) {
              filesToRead = allFiles.filter((f) => {
                const rel = f.replace(skillDir, "");
                if (rel === "SKILL.md") return true;
                return mentionedDirs.some((d) => rel.startsWith(d + "/") || rel === d);
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
              const aP = priorityPaths.findIndex((p) => a.includes(p));
              const bP = priorityPaths.findIndex((p) => b.includes(p));
              return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
            });

            const capped = filesToRead.slice(0, 20);
            const fileContents: string[] = [];
            const fileList: string[] = [];

            // ─── DYNAMIC: Read actual file contents from storage ───
            for (const filePath of capped) {
              const relativePath = filePath.replace(skillDir, "");
              controller.enqueue(sseEvent("status", { step: `Reading: ${skill.name}/${relativePath}` }));

              try {
                const { data: fileData } = await supabase.storage
                  .from("skill-files")
                  .download(filePath);

                if (fileData) {
                  const text = await fileData.text();
                  if (text.trim()) {
                    fileContents.push(
                      `#### File: ${relativePath}\n\`\`\`\n${text.slice(0, 4000)}\n\`\`\``
                    );
                    fileList.push(relativePath);
                  }
                }
              } catch {
                controller.enqueue(sseEvent("status", { step: `⚠ Could not read: ${relativePath}` }));
              }
            }

            // Build context block — NO static instructions, ONLY real files
            let block = `### Skill: ${skill.name}\n**Category:** ${skill.category}\n**Description:** ${skill.description}`;

            if (fileContents.length > 0) {
              block += `\n\n**Files found in storage (${fileContents.length}):**\n${fileList.map((f) => `- ${f}`).join("\n")}`;
              block += `\n\n**File Contents:**\n${fileContents.join("\n\n")}`;
            } else {
              block += `\n\n**Files found in storage:** NONE — no files exist in this skill's storage directory.`;
            }

            skillContextBlocks.push(block);
          }

          const skillRegistry = skillContextBlocks.join("\n\n---\n\n");

          controller.enqueue(sseEvent("status", { step: "Context assembled from storage. Generating response..." }));

          // ─── Phase 2: System prompt — strictly grounded in dynamic files ───
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
- If the user asks about a directory (e.g., "references"), list ONLY the files that were actually found and read from storage.
- Do NOT list files from skill instructions or templates — only from the actual storage scan.

## Retrieved Context (from Supabase Storage — dynamic, real-time)
${skillRegistry || "No skills or files found in storage."}

## Response format
- Markdown with code blocks labeled with filenames.
- Cite source files for every claim.
- End with execution summary table:

| Field | Value |
|---|---|
| **Intent** | <what user asked> |
| **Skill** | <matched skill or None> |
| **Files Read** | <actual files read from storage> |
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

          // Pipe LLM stream
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

async function listAllFiles(supabase: any, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const { data: items } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
    if (!items) return files;
    for (const item of items) {
      const fullPath = `${prefix}${item.name}`;
      if (item.id === null || item.metadata === undefined) {
        const subFiles = await listAllFiles(supabase, bucket, `${fullPath}/`);
        files.push(...subFiles);
      } else {
        const ext = item.name.split(".").pop()?.toLowerCase() || "";
        const textExts = ["md", "txt", "py", "js", "ts", "json", "yaml", "yml", "html", "css", "toml", "cfg", "ini", "sh"];
        if (textExts.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch { /* path may not exist */ }
  return files;
}
