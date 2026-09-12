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
  paper: `You are DreamForge's academic paper writer. Write a complete, submission-style academic report for the student's project.

Required sections, in this order, as markdown headings:
1. Title
2. Abstract (150-250 words, single paragraph)
3. Keywords (5-7, comma separated)
4. Introduction (motivation, problem statement, contributions as a bulleted list)
5. Related Work (compare 4-6 real, well-known works with (Author, Year) citations)
6. Methodology (system architecture, modules, algorithms, data flow; describe each module of the actual project)
7. Implementation (stack, key components, how the modules were built)
8. Results and Evaluation (evaluation metrics, a markdown results table, and honest discussion — never invent measured numbers, mark each measurable cell as **[ADD YOUR NUMBER]**)
9. Discussion and Limitations
10. Conclusion and Future Work
11. References (numbered, only papers or books you are confident exist; no invented DOIs or URLs)

Write real academic prose, not bullet-point placeholders. Clean markdown, no prose outside the report.`,
} as const;

const COST = { papers: 1, review: 2, report: 3, paper: 3 } as const;

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["papers", "review", "report", "paper"]),
        topic: z.string().min(3),
        projectId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    let brief = `Topic: ${data.topic}`;

    if (data.projectId) {
      const { data: project } = await context.supabase
        .from("projects")
        .select("title, dream, summary, stack, sprints")
        .eq("id", data.projectId)
        .maybeSingle();
      if (project) {
        brief = [
          `Project title: ${project.title}`,
          `Original dream: ${project.dream}`,
          project.summary ? `What it does: ${project.summary}` : "",
          Array.isArray(project.stack) && project.stack.length
            ? `Stack: ${project.stack.join(", ")}`
            : "",
          `Sprint plan: ${JSON.stringify(project.sprints).slice(0, 1500)}`,
          data.topic ? `Extra notes: ${data.topic}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

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
      prompt: brief,
      effort: data.kind === "papers" ? "low" : data.kind === "paper" ? "high" : "medium",
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

    if (data.projectId && (data.kind === "paper" || data.kind === "report")) {
      await context.supabase
        .from("projects")
        .update({ report_content: result.text })
        .eq("id", data.projectId);
    }

    const label =
      data.kind === "paper"
        ? "Academic report"
        : data.kind === "report"
          ? "Project report"
          : data.kind === "review"
            ? "Literature review"
            : "Paper list";

    await context.supabase.from("messages").insert({
      user_id: context.userId,
      role: "assistant",
      content: `**${label} ready — ${data.topic}**\n\nCost: ${cost} tokens. It is saved in your Research shelf${
        data.projectId ? " and attached to the project" : ""
      }, and you can download it as a PDF.`,
    });

    return {
      id: row?.id ?? null,
      kind: data.kind,
      topic: data.topic,
      content: result.text,
      cost,
      tokens: balance,
    };
  });
