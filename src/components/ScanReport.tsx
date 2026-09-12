import { toast } from "sonner";
import type { ScanFinding } from "@/lib/scans.functions";

const SEVERITY: Record<string, string> = {
  error: "bg-accent text-accent-foreground",
  warning: "bg-highlight text-highlight-foreground",
  tip: "bg-background",
};

export function ScanReport({
  summary,
  findings,
  originalCode,
  fixedCode,
  filename,
}: {
  summary: string;
  findings: ScanFinding[];
  originalCode: string;
  fixedCode: string;
  filename: string;
}) {
  const changed = Boolean(fixedCode) && fixedCode.trim() !== originalCode.trim();

  return (
    <div>
      <div className="brut bg-card p-5">
        <h2 className="font-display text-sm tracking-widest uppercase">What I found</h2>
        <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem]">
          {(["syntax", "logic", "security", "style"] as const).map((kind) => {
            const count = findings.filter((f) => f.kind === kind).length;
            return (
              <span key={kind} className="brut-sm bg-secondary px-2 py-1 font-display uppercase">
                {kind}: {count}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {findings.length === 0 && (
          <p className="text-sm text-muted-foreground">No problems found — nice work.</p>
        )}
        {findings.map((f, i) => (
          <article key={i} className="brut-sm bg-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`brut-sm px-2 py-1 font-display text-[0.65rem] uppercase ${SEVERITY[f.severity] ?? "bg-background"}`}
              >
                {f.severity}
              </span>
              {f.kind && (
                <span className="brut-sm bg-secondary px-2 py-1 font-display text-[0.65rem] uppercase">
                  {f.kind}
                </span>
              )}
              {typeof f.line === "number" && (
                <span className="text-xs text-muted-foreground">line {f.line}</span>
              )}
              <h3 className="text-base">{f.title}</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{f.explanation}</p>
            {f.fix && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="font-display text-[0.65rem] tracking-widest uppercase">Fix</p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(f.fix);
                      toast.success("Fix copied.");
                    }}
                    className="text-xs underline"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 overflow-auto border-2 border-border bg-background p-3 font-mono text-xs">
                  {f.fix}
                </pre>
              </div>
            )}
          </article>
        ))}
      </div>

      {fixedCode && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-sm tracking-widest uppercase">
              Before / after — {filename}
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(fixedCode);
                  toast.success("Fixed file copied.");
                }}
                className="brut-sm bg-accent px-3 py-2 font-display text-[0.65rem] text-accent-foreground uppercase"
              >
                Copy fixed file
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([fixedCode], { type: "text/plain" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `fixed-${filename}`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                }}
                className="brut-sm bg-card px-3 py-2 font-display text-[0.65rem] uppercase"
              >
                Download
              </button>
            </div>
          </div>
          {!changed && (
            <p className="mt-2 text-xs text-muted-foreground">
              The fixed version matches your file — nothing had to change.
            </p>
          )}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="font-display text-[0.65rem] tracking-widest uppercase">Before</p>
              <pre className="mt-2 max-h-[420px] overflow-auto border-2 border-border bg-background p-3 font-mono text-xs">
                {originalCode}
              </pre>
            </div>
            <div>
              <p className="font-display text-[0.65rem] tracking-widest text-accent uppercase">
                After
              </p>
              <pre className="mt-2 max-h-[420px] overflow-auto border-2 border-accent bg-background p-3 font-mono text-xs">
                {fixedCode}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
