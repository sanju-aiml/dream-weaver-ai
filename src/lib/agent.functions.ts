import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway } from "./ai.server";

const COST = 1;

const AGENT_PROMPT = `You are DreamForge's pair-programming agent. Complete the user's code request in the supplied language.

Rules:
- Return only the complete file contents, with no markdown fences or explanation.
- Preserve working code that is already present.
- Fill in unfinished code, repair obvious syntax errors, and keep the result runnable.
- Never add secrets, fake credentials, or destructive commands.
- Keep the answer focused on the requested change.`;

export const completeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        language: z.string().min(1),
        instruction: z.string().min(3),
        code: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: balance, error } = (await context.supabase.rpc("spend_tokens", {
      _amount: COST,
      _reason: "pair programming agent",
    })) as { data: number; error: { message: string } | null };

    if (error || typeof balance !== "number" || balance < 0) {
      throw new Error("insufficient tokens");
    }

    const result = await askGateway({
      instructions: AGENT_PROMPT,
      prompt: `Language: ${data.language}\nRequest: ${data.instruction}\n\nExisting code:\n${data.code ?? "(start from an empty file)"}`,
      effort: "medium",
    });

    if (!result.ok) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund pair agent" });
      throw new Error(result.message);
    }

    const code = result.text
      .replace(/^```[a-zA-Z0-9+#.-]*\s*/, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    if (!code) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund empty pair agent" });
      throw new Error("The coding agent returned an empty answer.");
    }

    return { code, language: data.language, cost: COST, tokens: balance };
  });