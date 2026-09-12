const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

export type GatewayResult =
  | { ok: true; text: string }
  | { ok: false; status: number; message: string };

/**
 * Calls the Lovable AI gateway Responses API in streaming mode and returns the
 * accumulated answer text. Streaming is required even when we only need the
 * final text, otherwise long reasoning runs exceed request timeouts.
 */
export async function askGateway(options: {
  instructions: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
}): Promise<GatewayResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ok: false, status: 500, message: "AI is not configured yet." };
  }

  const upstream = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: options.instructions,
      input: options.prompt,
      stream: true,
      store: false,
      reasoning: { effort: options.effort ?? "low" },
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
    return { ok: false, status: upstream.status || 500, message };
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

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
        const event = JSON.parse(payload) as { type?: string; delta?: string };
        if (event.type === "response.output_text.delta" && event.delta) {
          text += event.delta;
        }
      } catch {
        // ignore keep-alive noise
      }
    }
  }

  return { ok: true, text };
}

/** Pulls the first JSON object out of a model answer, fenced or not. */
export function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
