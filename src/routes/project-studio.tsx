import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { getTokens } from "@/lib/workspace";
import { scanCode, type ScanFinding } from "@/lib/scans.functions";

export const Route = createFileRoute("/project-studio")({
  head: () => ({
    meta: [
      { title: "Project Studio — DreamForge AI" },
      {
        name: "description",
        content: "Upload your code, run an error scan and get paste-ready fixes from your mentor.",
      },
      { property: "og:title", content: "Project Studio — DreamForge AI" },
      { property: "og:description", content: "Upload code, scan for errors, get fixes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectStudio,
});

function guessLanguage(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    c: "c",
    cpp: "c++",
    ino: "arduino",
    html: "html",
    css: "css",
    sql: "sql",
  };
  return map[ext] ?? "text";
}

const SEVERITY: Record<string, string> = {
  error: "bg-accent text-accent-foreground",
  warning: "bg-highlight text-highlight-foreground",
  tip: "bg-background",
};

function ProjectStudio() {
  const { session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [filename, setFilename] = useState("main.py");
  const [code, setCode] = useState("");
  const [errorLog, setErrorLog] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string; findings: ScanFinding[] } | null>(null);
  const scan = useServerFn(scanCode);

  useEffect(() => {
    if (!session) return;
    getTokens()
      .then(setTokens)
      .catch(() => setTokens(null));
  }, [session]);

  async function onFile(file: File) {
    const text = await file.text();
    setFilename(file.name);
    setCode(text.slice(0, 24000));
  }

  async function runScan() {
    if (code.trim().length < 5) {
      toast.error("Paste or upload some code first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await scan({
        data: {
          filename,
          language: guessLanguage(filename),
          code,
          ...(errorLog.trim() ? { errorLog } : {}),
        },
      });
      setResult({ summary: res.summary, findings: res.findings });
      setTokens(res.tokens);
      toast.success(`Scan complete — ${res.cost} token used.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(
        message.includes("insufficient") ? "Not enough tokens for a scan." : message.slice(0, 160),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen">
        <StudioNav />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-3xl">Sign in to scan your code</h1>
          <Link
            to="/auth"
            className="brut mt-6 inline-block bg-accent px-5 py-3 font-display text-sm text-accent-foreground uppercase"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <StudioNav email={session.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl sm:text-5xl">Project Studio</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Upload a file or paste your code. Add the error message if you have one. One token per scan.
        </p>

        <div className="brut mt-8 bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="brut-sm cursor-pointer bg-background px-3 py-2 font-display text-xs uppercase">
              Upload file
              <input
                type="file"
                className="hidden"
                accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.ino,.html,.css,.sql,.txt,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                }}
              />
            </label>
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="text-xs text-muted-foreground">{guessLanguage(filename)}</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="Paste your code here…"
            className="mt-4 w-full border-2 border-border bg-background p-3 font-mono text-xs outline-none focus:border-accent"
          />
          <textarea
            value={errorLog}
            onChange={(e) => setErrorLog(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="Optional: paste the error message or stack trace"
            className="mt-3 w-full border-2 border-border bg-background p-3 font-mono text-xs outline-none focus:border-accent"
          />

          <button
            type="button"
            onClick={runScan}
            disabled={busy}
            className="brut mt-4 bg-primary px-5 py-3 font-display text-sm text-primary-foreground uppercase disabled:opacity-60"
          >
            {busy ? "Scanning…" : "Run error scan (1 token)"}
          </button>
        </div>

        {result && (
          <section className="mt-8">
            <div className="brut bg-card p-5">
              <h2 className="font-display text-sm tracking-widest uppercase">What I found</h2>
              <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>
            </div>

            <div className="mt-5 space-y-4">
              {result.findings.length === 0 && (
                <p className="text-sm text-muted-foreground">No problems found — nice work.</p>
              )}
              {result.findings.map((f, i) => (
                <article key={i} className="brut-sm bg-card p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`brut-sm px-2 py-1 font-display text-[0.65rem] uppercase ${SEVERITY[f.severity] ?? "bg-background"}`}
                    >
                      {f.severity}
                    </span>
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
          </section>
        )}
      </div>
    </main>
  );
}
