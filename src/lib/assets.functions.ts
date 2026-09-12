import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway, extractJson } from "./ai.server";

export type Deck = {
  title: string;
  subtitle: string;
  slides: { heading: string; bullets: string[]; notes: string }[];
  poster: {
    headline: string;
    tagline: string;
    problem: string;
    solution: string;
    results: string[];
    footer: string;
  };
};

const DECK_PROMPT = `You are DreamForge's presentation designer. From a project description, write a college-ready deck and a poster.

Return ONLY JSON:
{
  "title": string,
  "subtitle": string,
  "slides": [{ "heading": string, "bullets": string[], "notes": string }],
  "poster": { "headline": string, "tagline": string, "problem": string, "solution": string, "results": string[], "footer": string }
}

Rules:
- 8 to 10 slides: Title, Problem, Objectives, Literature, Architecture, Implementation, Results, Demo, Conclusion, Future scope.
- 3 to 5 short bullets per slide, max 12 words each.
- "notes" is what the student says out loud, 2 sentences.
- Never invent specific numeric results; write results as things to measure, or mark them [ADD YOUR NUMBER].
- No prose outside the JSON.`;

const COST = 2;

export const generateDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ topic: z.string().min(3) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: balance, error: spendError } = (await context.supabase.rpc("spend_tokens", {
      _amount: COST,
      _reason: "slides + poster",
    })) as { data: number; error: { message: string } | null };

    if (spendError || typeof balance !== "number" || balance < 0) {
      throw new Error("insufficient tokens");
    }

    const result = await askGateway({
      instructions: DECK_PROMPT,
      prompt: `Project: ${data.topic}`,
      effort: "medium",
    });

    if (!result.ok) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund deck" });
      throw new Error(result.message);
    }

    const deck = extractJson<Deck>(result.text);
    if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund deck" });
      throw new Error("the deck came back unreadable — try again");
    }

    return { deck, cost: COST, tokens: balance };
  });
