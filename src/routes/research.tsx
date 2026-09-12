import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { getTokens } from "@/lib/workspace";
import { runResearch } from "@/lib/research.functions";
import { downloadTextPdf } from "@/lib/exports";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Reports — DreamForge AI" },
      {
        name: "description",
        content:
          "Find real papers, generate a literature review and write your full project report with your AI mentor.",
      },
      { property: "og:title", content: "Research & Reports — DreamForge AI" },
      {
        property: "og:description",
        content: "Paper finder, literature review and project report generator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Research,
});

const MODES = [
  { kind: "papers", label: "Find papers", cost: 1, blurb: "6-8 real papers with search strings" },
  { kind: "review", label: "Literature review", cost: 2, blurb: "~700 words with the research gap" },
  { kind: "report", label: "Project report", cost: 3, blurb: "Full report, abstract to references" },
] as const;

function Research() {
  const { session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<(typeof MODES)[number]["kind"]>("papers");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<{ kind: string; topic: string; content: string } | null>(null);
  const research = useServerFn(runResearch);

  useEffect(() => {
    if (!session) return;
    getTokens()
      .then(setTokens)
      .catch(() => setTokens(null));
  }, [session]);

  const mode = MODES.find((m) => m.kind === kind)!;

  async function submit() {
    if (topic.trim().length < 3) {
      toast.error("Give me a topic first.");
      return;
    }
    setBusy(true);
    setOutput(null);
    try {
      const res = await research({ data: { kind, topic: topic.trim() } });
      setOutput({ kind: res.kind, topic: res.topic, content: res.content });
      setTokens(res.tokens);
      toast.success(`Done — ${res.cost} token${res.cost > 1 ? "s" : ""} used.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(
        message.includes("insufficient")
          ? "Not enough tokens for that yet."
          : message.slice(0, 160),
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
          <h1 className="text-3xl">Sign in to use research mode</h1>
          <Link to="/auth" className="brut mt-6 inline-block bg-accent px-5 py-3 font-display text-sm text-accent-foreground uppercase">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <StudioNav email={session.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl sm:text-5xl">Research &amp; Reports</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Paper finder, literature review and full project report — the same mentor, in writing mode.
        </p>

        <div className="brut mt-8 bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.kind}
                type="button"
                onClick={() => setKind(m.kind)}
                className={`brut-sm px-3 py-2 font-display text-xs uppercase ${
                  kind === m.kind ? "bg-accent text-accent-foreground" : "bg-background"
                }`}
              >
                {m.label} · {m.cost}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{mode.blurb}</p>

          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="e.g. AI smart study assistant for college students — personalised plans, summaries, quizzes and progress tracking"
            className="mt-4 w-full border-2 border-border bg-background p-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="brut mt-4 bg-primary px-5 py-3 font-display text-sm text-primary-foreground uppercase disabled:opacity-60"
          >
            {busy ? "Working…" : `${mode.label} (${mode.cost} token${mode.cost > 1 ? "s" : ""})`}
          </button>
        </div>

        {output && (
          <section className="brut mt-8 bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
              <h2 className="font-display text-sm tracking-widest uppercase">{output.kind}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(output.content);
                    toast.success("Copied.");
                  }}
                  className="brut-sm bg-background px-3 py-2 font-display text-xs uppercase"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => void downloadTextPdf(output.content, `${output.kind}-${output.topic}`)}
                  className="brut-sm bg-highlight px-3 py-2 font-display text-xs text-highlight-foreground uppercase"
                >
                  PDF
                </button>
              </div>
            </div>
            <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {output.content}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
