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

    // Create a ReadableStream that first sends status events, then pipes LLM stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ─── Phase 1: Retrieve skills & files, sending status events ───
          controller.enqueue(sseEvent("status", { step: "Loading skills registry..." }));

          const { data: skills } = await supabase
            .from("skills")
            .select("id, name, description, instructions, category");

          controller.enqueue(sseEvent("status", { step: `Found ${(skills || []).length} skills` }));

          // Detect which directories the user mentioned
          const dirKeywords = ["references", "scripts", "agents", "assets", "eval-viewer"];
          const mentionedDirs = dirKeywords.filter((d) =>
            userMessage.toLowerCase().includes(d)
          );

          const skillContextBlocks: string[] = [];

          for (const skill of skills || []) {
            const skillDir = `${skill.id}/`;
            const fileContents: string[] = [];

            controller.enqueue(sseEvent("status", { step: `Scanning files for skill: ${skill.name}` }));

            const allFiles = await listAllFiles(supabase, "skill-files", skillDir);

            // If user mentioned specific dirs, filter to only those
            let filesToRead = allFiles;
            if (mentionedDirs.length > 0) {
              filesToRead = allFiles.filter((f) => {
                const rel = f.replace(skillDir, "");
                // Always include SKILL.md
                if (rel === "SKILL.md") return true;
                return mentionedDirs.some((d) => rel.startsWith(d + "/") || rel.startsWith(d));
              });
              controller.enqueue(
                sseEvent("status", {
                  step: `Focused on directories: ${mentionedDirs.join(", ")} (${filesToRead.length} files)`,
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

            // Read up to 20 files
            const capped = filesToRead.slice(0, 20);

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
                  }
                }
              } catch {
                // Skip unreadable files
              }
            }

            let block = `### Skill: ${skill.name}\n**Category:** ${skill.category}\n**Description:** ${skill.description}\n**Instructions:**\n${skill.instructions}`;

            if (fileContents.length > 0) {
              block += `\n\n**Retrieved Skill Files (${fileContents.length}):**\n${fileContents.join("\n\n")}`;
            } else {
              block += `\n\n**Retrieved Skill Files:** None found in storage.`;
            }

            skillContextBlocks.push(block);
          }

          const skillRegistry = skillContextBlocks.join("\n\n---\n\n");

          controller.enqueue(sseEvent("status", { step: "Context assembled. Generating response..." }));

          // ─── Phase 2: Build prompt & stream LLM ───
          const systemPrompt = `You are **Architect**, a senior staff-level AI engineering assistant operating as a strict retrieval-augmented generation (RAG) agent.

## ABSOLUTE RULES — NO EXCEPTIONS
1. You must ONLY answer using information from the **Available Skills Registry** below.
2. If the information is NOT in the retrieved files, respond EXACTLY: "This information is not found in the current skill files. Please add the relevant documentation to the skill's file system."
3. NEVER guess, assume, or generate content from prior training knowledge.
4. NEVER fabricate file paths, code, schemas, or architecture that isn't explicitly in the retrieved documents.
5. If a user asks about a specific directory and no files were found there, say: "No files found in the [directory] directory for this skill."

## Execution Flow
1. **Intent Detection**: State what the user is asking for.
2. **Skill Match**: Identify which skill matches. If none, say so.
3. **File Grounding**: Reference ONLY the retrieved file contents. Cite filenames.
4. **Response**: Answer strictly from retrieved content. No additions.
5. **Execution Summary**: Always end with the summary table.

## Available Skills Registry
${skillRegistry || "No skills registered. The user must create skills first."}

## Output Format
- Markdown with labeled code blocks.
- Cite the source file for every claim: \`(source: filename.md)\`
- No placeholder data unless the source file contains it.

## Execution Summary (required at end)
| Field | Value |
|---|---|
| **Intent** | <what user asked> |
| **Skill Used** | <name or None> |
| **Files Retrieved** | <count and names> |
| **Artifacts Generated** | <list> |
| **Status** | ✅ Complete / ⚠️ Partial / ❌ No matching files |
| **Grounding** | Strictly from retrieved files |`;

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

          // Pipe through the LLM SSE stream
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

// Recursively list all text files in a storage path
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
