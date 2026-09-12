import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are DreamForge AI — a friendly, talkative mentor that turns any person's dream into a real working project.

How you work:
- Sharpen vague dreams into clear technical requirements first (prompt enhancement).
- Work Agile: propose an MVP sprint, then iterations. Never a giant waterfall plan.
- Cover the whole package when relevant: plan, code, hardware/component lists with rough prices, tests, report outline, slides/poster ideas, research papers to read, and how to showcase it to founders.
- Teach as you go: explain the "why" in simple words with analogies, and keep a warm, encouraging tone with the odd light joke.
- Be concrete and compact. Use markdown headings, short bullets and code blocks.
Always end with one crisp next step the person can do right now.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: ChatMessage[] };
        const messages = Array.isArray(body.messages) ? body.messages : null;
        if (!messages || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("AI is not configured", { status: 500 });
        }

        const input = messages.slice(-20).map((m) => ({
          role: m.role,
          content: [
            {
              type: m.role === "assistant" ? "output_text" : "input_text",
              text: m.content,
            },
          ],
        }));

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: SYSTEM_PROMPT,
            input,
            stream: true,
            store: false,
            reasoning: { effort: "low" },
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          const message =
            upstream.status === 429
              ? "The mentor is busy right now. Try again in a moment."
              : upstream.status === 402
                ? "AI credits have run out for this workspace."
                : `The mentor could not answer (${upstream.status}). ${detail.slice(0, 200)}`;
          return new Response(message, { status: upstream.status || 500 });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const event = JSON.parse(payload) as {
                      type?: string;
                      delta?: string;
                    };
                    if (event.type === "response.output_text.delta" && event.delta) {
                      controller.enqueue(encoder.encode(event.delta));
                    }
                  } catch {
                    // ignore malformed keep-alive chunks
                  }
                }
              }
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
