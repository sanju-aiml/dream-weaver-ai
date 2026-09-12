import { createFileRoute } from "@tanstack/react-router";
import { askGateway, extractJson } from "@/lib/ai.server";

type GeneratedProject = {
  title: string;
  summary: string;
  stack: string[];
  sprints: { name: string; goal: string; tasks: string[] }[];
  files: { path: string; language: string; code: string }[];
  nextStep: string;
};

const INSTRUCTIONS = `You are DreamForge's project builder. You turn a person's dream into a real, working starter project.

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
- 3 sprints maximum, each with 3-5 short tasks.
- 3 to 6 files. They MUST be real, runnable, complete code — no "TODO" placeholders.
- Always include one file that is a single self-contained HTML page (path "index.html", language "html") that visually demonstrates the dream working in a browser. Inline all CSS and JS in that file. No external build step, no CDN that requires a key.
- Keep every file under 200 lines.
- Plain, encouraging language in summary and nextStep.
- No prose outside the JSON.`;

export const Route = createFileRoute("/api/generate-project")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { dream?: string };
        const dream = (body.dream ?? "").trim();
        if (!dream) return new Response("Describe your dream first", { status: 400 });

        const result = await askGateway({
          instructions: INSTRUCTIONS,
          prompt: `The dream: ${dream}`,
          effort: "medium",
        });

        if (!result.ok) return new Response(result.message, { status: result.status });

        const project = extractJson<GeneratedProject>(result.text);
        if (!project || !Array.isArray(project.files) || project.files.length === 0) {
          return new Response("The builder returned something unusable. Try again.", {
            status: 502,
          });
        }

        return Response.json({
          title: project.title || "Untitled project",
          summary: project.summary ?? "",
          stack: Array.isArray(project.stack) ? project.stack : [],
          sprints: Array.isArray(project.sprints) ? project.sprints : [],
          files: project.files,
          nextStep: project.nextStep ?? "",
        });
      },
    },
  },
});
