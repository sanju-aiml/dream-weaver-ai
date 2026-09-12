import { createFileRoute } from "@tanstack/react-router";
import { askGateway } from "@/lib/ai.server";

type Kind = "papers" | "review" | "report";

const INSTRUCTIONS: Record<Kind, string> = {
  papers: `You are DreamForge's research paper finder. Given a topic, list 8 highly relevant, real, well-known papers or survey articles.
For each: **Title** (year) — authors, venue, a one-line "why it matters for your project", and a search string the student can paste into Google Scholar.
Only cite work you are confident exists; if unsure about a specific paper, give the survey/venue and say it is a starting point rather than inventing a citation.
Finish with a short "Read in this order" list. Markdown only.`,
  review: `You are DreamForge's literature review writer. Write a structured literature review of about 700 words on the topic.
Sections: Introduction, Key themes (3-4 themed paragraphs), Methods commonly used, Gaps and open problems, How this project fits in, References (author-year style, only well-established works).
Warn the reader in one line to verify every citation before submitting. Markdown only.`,
  report: `You are DreamForge's project report generator. Produce a complete academic project report draft in markdown.
Include: Title page block, Abstract, 1. Introduction, 2. Literature survey, 3. Methodology (with a component/tech table), 4. Implementation, 5. Results and discussion (with placeholders clearly marked for the student's own numbers), 6. Conclusion and future work, References.
Be concrete to the topic given, not generic. Markdown only.`,
};

export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { kind?: Kind; topic?: string };
        const topic = (body.topic ?? "").trim();
        const kind = body.kind;
        if (!topic || !kind || !(kind in INSTRUCTIONS)) {
          return new Response("A topic and a mode are required", { status: 400 });
        }

        const result = await askGateway({
          instructions: INSTRUCTIONS[kind],
          prompt: `Topic / project: ${topic}`,
          effort: "medium",
        });

        if (!result.ok) return new Response(result.message, { status: result.status });
        return Response.json({ content: result.text });
      },
    },
  },
});
