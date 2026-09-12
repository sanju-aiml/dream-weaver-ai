import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askGateway, extractJson } from "./ai.server";

export type ScanFinding = {
  severity: "error" | "warning" | "tip";
  line?: number;
  title: string;
  explanation: string;
  fix: string;
};

const SCAN_PROMPT = `You are DreamForge's code doctor. Read the code (and any error log) and find real problems.

Return ONLY JSON:
{
  "summary": string,
  "findings": [{ "severity": "error" | "warning" | "tip", "line": number, "title": string, "explanation": string, "fix": string }]
}

Rules:
- Up to 8 findings, most serious first. If the code is fine, return an empty findings array and say so in summary.
- "fix" must contain the corrected code snippet, ready to paste.
- Explain in plain, kind language a second-year student understands.
- No prose outside the JSON.`;

const COST = 1;

export const scanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        filename: z.string().min(1),
        language: z.string().min(1),
        code: z.string().min(5),
        errorLog: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: balance, error: spendError } = (await context.supabase.rpc("spend_tokens", {
      _amount: COST,
      _reason: `error scan: ${data.filename}`,
    })) as { data: number; error: { message: string } | null };

    if (spendError || typeof balance !== "number" || balance < 0) {
      throw new Error("insufficient tokens");
    }

    const result = await askGateway({
      instructions: SCAN_PROMPT,
      prompt: `File: ${data.filename}\nLanguage: ${data.language}\n\nCode:\n${data.code.slice(0, 24000)}\n\n${
        data.errorLog ? `Error log:\n${data.errorLog.slice(0, 4000)}` : "No error log provided."
      }`,
      effort: "medium",
    });

    if (!result.ok) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund scan" });
      throw new Error(result.message);
    }

    const parsed = extractJson<{ summary: string; findings: ScanFinding[] }>(result.text);
    if (!parsed) {
      await context.supabase.rpc("spend_tokens", { _amount: -COST, _reason: "refund scan" });
      throw new Error("the scan came back unreadable — try again");
    }

    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];

    const { data: row } = await context.supabase
      .from("code_scans")
      .insert({
        user_id: context.userId,
        filename: data.filename,
        language: data.language,
        code: data.code.slice(0, 24000),
        summary: parsed.summary ?? "",
        findings: JSON.parse(JSON.stringify(findings)),
      })
      .select()
      .single();

    return {
      id: row?.id ?? null,
      summary: parsed.summary ?? "",
      findings,
      cost: COST,
      tokens: balance,
    };
  });
