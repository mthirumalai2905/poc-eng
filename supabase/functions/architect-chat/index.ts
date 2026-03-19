import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ─── Step 1: Load all skills metadata from DB ───
    const { data: skills } = await supabase
      .from("skills")
      .select("id, name, description, instructions, category");

    // ─── Step 2: For each skill, retrieve files from storage (RAG retrieval) ───
    const skillContextBlocks: string[] = [];

    for (const skill of skills || []) {
      const skillDir = `${skill.id}/`;
      let fileContents: string[] = [];

      // List all files recursively in the skill's storage directory
      const retrievedFiles = await listAllFiles(supabase, "skill-files", skillDir);

      // Prioritize key files: SKILL.md, references/, agents/
      const priorityPaths = [
        "SKILL.md",
        "references/",
        "agents/",
        "scripts/",
      ];

      // Sort: priority files first
      const sorted = retrievedFiles.sort((a, b) => {
        const aP = priorityPaths.findIndex((p) => a.includes(p));
        const bP = priorityPaths.findIndex((p) => b.includes(p));
        return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
      });

      // Read up to 15 files per skill to stay within context limits
      const filesToRead = sorted.slice(0, 15);

      for (const filePath of filesToRead) {
        try {
          const { data: fileData } = await supabase.storage
            .from("skill-files")
            .download(filePath);

          if (fileData) {
            const text = await fileData.text();
            if (text.trim()) {
              const relativePath = filePath.replace(skillDir, "");
              fileContents.push(
                `#### File: ${relativePath}\n\`\`\`\n${text.slice(0, 3000)}\n\`\`\``
              );
            }
          }
        } catch {
          // Skip unreadable files
        }
      }

      // Build skill context block
      let block = `### Skill: ${skill.name}\n**Category:** ${skill.category}\n**Description:** ${skill.description}\n**Instructions:**\n${skill.instructions}`;

      if (fileContents.length > 0) {
        block += `\n\n**Retrieved Skill Files (${fileContents.length}):**\n${fileContents.join("\n\n")}`;
      }

      skillContextBlocks.push(block);
    }

    const skillRegistry = skillContextBlocks.join("\n\n---\n\n");

    // ─── Step 3: Build RAG-enforced system prompt ───
    const systemPrompt = `You are **Architect**, a senior staff-level AI engineering assistant operating as a strict retrieval-augmented generation (RAG) agent with skill-based orchestration.

## CRITICAL: RAG-Only Behavior
- You must NEVER hallucinate, guess, or fabricate file paths, directory contents, schemas, or architecture patterns.
- You must ONLY use information explicitly present in the **Available Skills Registry** below.
- If information is not found in the retrieved skill documents, you MUST explicitly state: "This information is not found in the current skill files."
- You are NOT allowed to generate answers from prior knowledge or assumptions. Every claim must be grounded in retrieved content.
- Treat the skill file system as the **single source of truth**.

## Execution Pipeline (Strict Sequence)
When a user submits a request:
1. **Intent Detection**: Analyze the prompt and determine which skill best matches. State the detected intent explicitly.
2. **Directory Resolution**: If the user mentions a specific directory (references/, scripts/, agents/, etc.), focus ONLY on that directory. Otherwise, load all relevant files.
3. **Skill Loading**: Use the matched skill's instructions AND retrieved file contents as your primary context.
4. **Context Assembly**: Combine user request + skill instructions + retrieved file contents. No external knowledge.
5. **Planning**: Generate a short execution plan grounded in retrieved documents.
6. **Generation**: Produce engineering artifacts (code, schemas, configs, etc.) strictly following the skill instructions and file contents.
7. **Validation**: Ensure output respects naming conventions, monitoring requirements, and architecture rules defined in the skill files.

## Available Skills Registry
${skillRegistry || "No skills registered yet. Suggest the user create a skill first."}

## Output Rules
- Use markdown with code blocks for all generated code.
- Label each code block with the filename.
- Be precise, objective, and architecture-first.
- Never include placeholder or mock data unless the skill explicitly allows it.
- If no skill matches the request, say so and suggest creating one.
- If a skill has insufficient documentation or files, warn the user explicitly.

## Execution Summary
Always end your response with an **Execution Summary** in this exact markdown table format:

| Field | Value |
|---|---|
| **Intent** | <detected intent> |
| **Skill Used** | <skill name or "None"> |
| **Files Retrieved** | <count and key filenames> |
| **Artifacts Generated** | <list of generated files/outputs> |
| **Status** | ✅ Complete / ⚠️ Partial / ❌ Failed |
| **Grounding** | All outputs grounded in retrieved skill files |`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("architect-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ─── Helper: Recursively list all files in a storage bucket path ───
async function listAllFiles(
  supabase: any,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const files: string[] = [];

  try {
    const { data: items } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 100 });

    if (!items) return files;

    for (const item of items) {
      const fullPath = `${prefix}${item.name}`;
      if (item.id === null || item.metadata === undefined) {
        // It's a folder — recurse
        const subFiles = await listAllFiles(supabase, bucket, `${fullPath}/`);
        files.push(...subFiles);
      } else {
        // It's a file — only include text-readable files
        const ext = item.name.split(".").pop()?.toLowerCase() || "";
        const textExts = ["md", "txt", "py", "js", "ts", "json", "yaml", "yml", "html", "css", "toml", "cfg", "ini", "sh"];
        if (textExts.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Storage path may not exist yet
  }

  return files;
}
