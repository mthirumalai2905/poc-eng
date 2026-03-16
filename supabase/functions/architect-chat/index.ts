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

    // Load all skills for context
    const { data: skills } = await supabase
      .from("skills")
      .select("name, description, instructions, category");

    // Build the skill registry context
    const skillRegistry = (skills || [])
      .map(
        (s: any) =>
          `### Skill: ${s.name}\n**Category:** ${s.category}\n**Description:** ${s.description}\n**Instructions:**\n${s.instructions}`
      )
      .join("\n\n---\n\n");

    const systemPrompt = `You are **Architect**, a senior staff-level AI engineering assistant. You generate production-ready code, schemas, and pipelines using modular engineering skills.

## Execution Pipeline
When a user submits a request:
1. **Intent Detection**: Analyze the prompt and determine which skill best matches.
2. **Skill Loading**: Use the matched skill's instructions as your primary guideline.
3. **Context Assembly**: Combine user request + skill instructions.
4. **Planning**: Generate a short execution plan.
5. **Generation**: Produce engineering artifacts (code, schemas, configs, etc.) strictly following the skill instructions.
6. **Validation**: Ensure output respects naming conventions, monitoring requirements, and architecture rules.

## Available Skills Registry
${skillRegistry || "No skills registered yet."}

## Rules
- Never fabricate architecture, schemas, or standards not present in skill instructions.
- Always follow the skill's SKILL.md instructions step by step.
- Use deterministic, structured output. No placeholder or mock data.
- If no skill matches, say so and suggest creating one.
- If a skill has insufficient documentation, warn the user.
- Always end with an **Execution Summary** table showing: Intent, Skill Used, Context Loaded, Artifacts Generated, and Status.

## Output Format
- Use markdown with code blocks for all generated code.
- Label each code block with the filename.
- Provide clear explanations of architectural decisions.
- Be precise, objective, and architecture-first.`;

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
      console.error("Grok API error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `Grok API error: ${response.status}` }), {
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
