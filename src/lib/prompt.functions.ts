import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway } from "./ai.server";

const REFACTOR_PROMPT = `You rewrite a student's rough project idea into one sharp build brief for an AI project builder.

Rules:
- Keep the person's actual idea. Never swap it for a different project.
- One paragraph, 50-80 words, plain language.
- Name the main features, who uses it, and what the first working version should show on screen.
- Output only the rewritten brief. No headings, no bullets, no quotes, no commentary.`;

/** Free "prompt refactor" used by the small wand icon next to the dream box. */
export const refinePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ draft: z.string().min(3).max(2000) }).parse(data))
  .handler(async ({ data }) => {
    const result = await askGateway({
      instructions: REFACTOR_PROMPT,
      prompt: data.draft,
      effort: "low",
    });
    if (!result.ok) throw new Error(result.message);
    const text = result.text.trim().replace(/^["']|["']$/g, "");
    if (!text) throw new Error("Could not sharpen that prompt.");
    return { prompt: text };
  });
