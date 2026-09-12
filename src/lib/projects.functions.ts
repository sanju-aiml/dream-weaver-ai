import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway, extractJson } from "./ai.server";

type GeneratedProject = {
  title: string;
  summary: string;
  stack: string[];
  sprints: { name: string; goal: string; tasks: string[] }[];
  files: { path: string; language: string; code: string }[];
  nextStep: string;
};

const BUILDER_PROMPT = `You are DreamForge's project builder. You turn a person's dream into a real, working starter project.

Return ONLY a JSON object with this exact shape:
{
  "title": string,
  "summary": string,
  "stack": string[],
  "sprints": [{ "name": string, "goal": string, "tasks": string[] }],
  "files": [{ "path": string, "language": string, "code": string }],
  "nextStep": string
}

Rules:
- 3 sprints maximum, each with 3 short tasks.
- Exactly 3 files. They MUST be real, runnable, complete code — no "TODO" placeholders.
- Always include one file that is a single self-contained HTML page (path "index.html", language "html") that visually demonstrates the dream working in a browser. Inline all CSS and JS in that file. No external build step, no CDN that requires a key.
- Keep every file under 140 lines. Be concise: working over exhaustive.
- Plain, encouraging language in summary and nextStep.
- No prose outside the JSON.`;

const COST = 3;

export const forgeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        dream: z.string().min(2),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: newBalance, error: spendError } = (await context.supabase.rpc("spend_tokens", {
      _amount: COST,
      _reason: "generated project",
    })) as { data: number; error: { message: string } | null };

    if (spendError || typeof newBalance !== "number" || newBalance < 0) {
      throw new Error("insufficient tokens");
    }

    const result = await askGateway({
      instructions: BUILDER_PROMPT,
      prompt: `The dream: ${data.dream}`,
      effort: "medium",
    });

    if (!result.ok) {
      // refund on failure
      await context.supabase.rpc("spend_tokens", {
        _amount: -COST,
        _reason: "refund failed generation",
      });
      throw new Error(result.message || "builder failed");
    }

    const project = extractJson<GeneratedProject>(result.text);
    if (!project || !Array.isArray(project.files) || project.files.length === 0) {
      await context.supabase.rpc("spend_tokens", {
        _amount: -COST,
        _reason: "refund unusable generation",
      });
      throw new Error("unusable builder output");
    }

    const title = project.title || "Untitled project";
    const { data: row, error: insertError } = await context.supabase
      .from("projects")
      .insert({
        user_id: context.userId,
        title,
        dream: data.dream,
        summary: project.summary ?? "",
        stack: Array.isArray(project.stack) ? project.stack : [],
        sprints: Array.isArray(project.sprints) ? project.sprints : [],
        files: project.files,
        cost: COST,
      } as any)
      .select()
      .single();

    if (insertError || !row) {
      await context.supabase.rpc("spend_tokens", {
        _amount: -COST,
        _reason: "refund save failure",
      });
      throw new Error("could not save project");
    }

    return {
      project: {
        id: row.id,
        title,
        summary: project.summary ?? "",
        dream: data.dream,
        stack: Array.isArray(project.stack) ? project.stack : [],
        sprints: Array.isArray(project.sprints) ? project.sprints : [],
        files: project.files,
        cost: COST,
      },
      tokens: newBalance,
    };
  });
