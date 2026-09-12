import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway } from "./ai.server";

const PROMPTS = {
  papers: `You are DreamForge's research librarian. Given a topic, list 6 to 8 genuinely well known, real, verifiable academic papers or survey articles.
For each: title, authors, venue, year, one-sentence relevance, and a search string the student can paste into Google Scholar.
Never invent a DOI or a link. If you are not confident a paper exists, leave it out.
Format as clean markdown with numbered entries.`,
  review: `You are DreamForge's academic writing mentor. Write a literature review on the topic.
Structure: Introduction, 3-4 thematic sections comparing approaches, research gap, and how the student's project fits the gap.
Cite only papers you are confident exist, in (Author, Year) form. Around 700 words. Clean markdown.`,
  report: `You are DreamForge's report generator. Produce a full college project report outline with written content.
Sections: Abstract, Introduction, Literature Survey, Methodology, System Design, Implementation, Testing, Results, Conclusion, Future Scope, References.
Write real paragraphs (not placeholders) based on the topic. Mark any figure or table the student must add as **[ADD YOUR OWN: ...]**. Clean markdown.`,
} as const;

const COST = { papers: 1, review: 2, report: 3 } as const;

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["papers", "review", "report"]),
        topic: z.string().min(3),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const cost = COST[data.kind];
    const { data: balance, error: spendError } = (await context.supabase.rpc("spend_tokens", {
      _amount: cost,
      _reason: `research: ${data.kind}`,
    })) as { data: number; error: { message: string } | null };

    if (spendError || typeof balance !== "number" || balance < 0) {
      throw new Error("insufficient tokens");
    }

    const result = await askGateway({
      instructions: PROMPTS[data.kind],
      prompt: `Topic: ${data.topic}`,
      effort: data.kind === "papers" ? "low" : "medium",
    });

    if (!result.ok || !result.text.trim()) {
      await context.supabase.rpc("spend_tokens", { _amount: -cost, _reason: "refund research" });
      throw new Error(result.ok ? "empty answer" : result.message);
    }

    const { data: row } = await context.supabase
      .from("research_items")
      .insert({
        user_id: context.userId,
        kind: data.kind,
        topic: data.topic,
        content: result.text,
      })
      .select()
      .single();

    return {
      id: row?.id ?? null,
      kind: data.kind,
      topic: data.topic,
      content: result.text,
      cost,
      tokens: balance,
    };
  });
