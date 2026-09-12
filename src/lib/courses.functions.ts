import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway, extractJson } from "./ai.server";
import type { Lesson } from "./courses";

type GeneratedCourse = {
  title: string;
  summary: string;
  lessons: Lesson[];
};

const COURSE_PROMPT = `You are DreamForge's course designer. You turn a project or subject into a short, practical college course that a student can finish while building the project.

Return ONLY JSON:
{
  "title": string,
  "summary": string,
  "lessons": [{
    "title": string,
    "objective": string,
    "content": string,
    "keyPoints": string[],
    "quiz": [{ "question": string, "options": string[], "answer": number, "explain": string }]
  }]
}

Rules:
- Exactly 5 lessons, ordered from setup to shipping.
- "content" is markdown, 120-200 words, plain friendly language, with one concrete example or snippet.
- 3 key points per lesson, short.
- 2 quiz questions per lesson, each with exactly 4 options; "answer" is the 0-based index of the right option; "explain" is one sentence.
- No emoji, no filler, no prose outside the JSON.`;

const COST = 2;

export const generateCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        subject: z.string().min(3),
        projectId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    let brief = `Subject: ${data.subject}`;

    if (data.projectId) {
      const { data: project } = await context.supabase
        .from("projects")
        .select("title, dream, summary, stack")
        .eq("id", data.projectId)
        .maybeSingle();
      if (project) {
        brief = [
          `Build the course around this student project.`,
          `Project title: ${project.title}`,
          `Original dream: ${project.dream}`,
          project.summary ? `What it does: ${project.summary}` : "",
          Array.isArray(project.stack) && project.stack.length
            ? `Stack: ${project.stack.join(", ")}`
            : "",
          `Focus: ${data.subject}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    const { data: balance, error: spendError } = (await context.supabase.rpc("spend_tokens", {
      _amount: COST,
      _reason: "course generation",
    })) as { data: number; error: { message: string } | null };

    if (spendError || typeof balance !== "number" || balance < 0) {
      throw new Error("insufficient tokens");
    }

    const result = await askGateway({
      instructions: COURSE_PROMPT,
      prompt: brief,
      effort: "medium",
    });

    if (!result.ok) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund course" });
      throw new Error(result.message);
    }

    const course = extractJson<GeneratedCourse>(result.text);
    if (!course || !Array.isArray(course.lessons) || course.lessons.length === 0) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund course" });
      throw new Error("The course came back unusable. Try again.");
    }

    const { data: row, error: insertError } = await context.supabase
      .from("courses")
      .insert({
        user_id: context.userId,
        project_id: data.projectId ?? null,
        title: course.title || data.subject,
        subject: data.subject,
        summary: course.summary ?? "",
        lessons: course.lessons as unknown as never,
        progress: { completed: [], scores: {} } as unknown as never,
      })
      .select()
      .single();

    if (insertError || !row) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund course save" });
      throw new Error("Could not save the course.");
    }

    return { courseId: row.id as string, tokens: balance, title: course.title || data.subject };
  });
