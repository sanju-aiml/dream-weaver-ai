import { createFileRoute } from "@tanstack/react-router";
import { askGateway, extractJson } from "@/lib/ai.server";

type ScanResult = {
  summary: string;
  language: string;
  findings: {
    severity: "critical" | "warning" | "polish";
    line: number | null;
    title: string;
    explanation: string;
    fix: string;
  }[];
};

const INSTRUCTIONS = `You are DreamForge's code doctor. You scan a single file for errors and problems.

Return ONLY a JSON object:
{
  "summary": string,
  "language": string,
  "findings": [{
    "severity": "critical" | "warning" | "polish",
    "line": number or null,
    "title": string,
    "explanation": string,
    "fix": string
  }]
}

Rules:
- "critical" = it crashes or is plainly wrong. "warning" = risky or buggy in some cases. "polish" = readability/performance.
- "explanation" is one or two friendly sentences, no jargon dumping.
- "fix" is the corrected code snippet (a fenced code block is fine) or precise instructions.
- If the file looks healthy, return an empty findings array and say so in summary.
- Maximum 10 findings, most important first. No prose outside the JSON.`;

export const Route = createFileRoute("/api/scan-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { filename?: string; code?: string };
        const code = (body.code ?? "").trim();
        const filename = (body.filename ?? "snippet.txt").trim();
        if (!code) return new Response("Paste or upload some code first", { status: 400 });
        if (code.length > 60000) {
          return new Response("That file is too big — split it into smaller parts.", {
            status: 400,
          });
        }

        const result = await askGateway({
          instructions: INSTRUCTIONS,
          prompt: `File: ${filename}\n\n\`\`\`\n${code}\n\`\`\``,
          effort: "medium",
        });

        if (!result.ok) return new Response(result.message, { status: result.status });

        const scan = extractJson<ScanResult>(result.text);
        if (!scan) {
          return new Response("The scan came back unreadable. Try again.", { status: 502 });
        }

        return Response.json({
          summary: scan.summary ?? "",
          language: scan.language ?? "",
          findings: Array.isArray(scan.findings) ? scan.findings : [],
        });
      },
    },
  },
});
