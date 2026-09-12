import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { getTokens } from "@/lib/workspace";
import { forgeProject } from "@/lib/projects.functions";
import { makeDemoBlobUrl, type ProjectFile } from "@/lib/projects";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Builder — DreamForge AI" },
      { name: "description", content: "Describe your dream and let DreamForge build a working starter project." },
      { property: "og:title", content: "Builder — DreamForge AI" },
      { property: "og:description", content: "Describe your dream and let DreamForge build a working starter project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Builder,
});

const SUGGESTIONS = [
  "AI Smart Study Assistant for college students",
  "A website that books salon appointments",
  "A Python script that sorts my study PDFs",
  "A portfolio for a photography student",
];

function Builder() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const forge = useServerFn(forgeProject);
  const [dream, setDream] = useState("");
  const [tokens, setTokens] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{
    project: { id: string; title: string; summary: string; files: ProjectFile[] };
    tokens: number;
  } | null>(null);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) void navigate({ to: "/auth" });
  }, [sessionLoading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    getTokens().then(setTokens).catch(() => setTokens(null));
  }, [session]);

  useEffect(() => {
    if (!result) return;
    const url = makeDemoBlobUrl(result.project.files);
    setDemoUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [result]);

  async function build() {
    const trimmed = dream.trim();
    if (!trimmed || working) return;
    if ((tokens ?? 0) < 3) {
      toast.error("You need at least 3 tokens to forge a project.");
      return;
    }
    setWorking(true);
    try {
      const data = await forge({ data: { dream: trimmed } });
      setResult(data);
      setTokens(data.tokens);
      toast.success(`Forged ${data.project.title}`);
    } catch (error) {
      toast.error((error as Error).message || "Could not build your project.");
    } finally {
      setWorking(false);
    }
  }

  if (sessionLoading || !session) {
    return (
      <main className="min-h-screen">
        <StudioNav />
        <p className="px-8 py-12">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <StudioNav email={session.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl">Project Builder</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Describe your dream. DreamForge will plan sprints, generate real code, and save it to your
            projects.
          </p>
        </div>

        <div className="mt-10 brut bg-card p-4">
          <label htmlFor="dream" className="font-display text-xs uppercase tracking-widest">
            Your dream
          </label>
          <textarea
            id="dream"
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            rows={5}
            placeholder="I want a Smart Study Assistant that creates personalized study plans, summarizes notes, and quizzes me..."
            className="mt-2 w-full resize-none border-2 border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Cost: 3 tokens</span>
            <button
              type="button"
              onClick={() => void build()}
              disabled={working || dream.trim().length < 3}
              className="brut-sm bg-accent px-5 py-2 font-display text-sm text-accent-foreground uppercase disabled:opacity-40"
            >
              {working ? "Forging..." : "Forge project"}
            </button>
          </div>
        </div>

        {!result && (
          <div className="mt-8">
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDream(s)}
                  className="brut-sm bg-secondary px-3 py-1.5 text-left text-xs hover:-translate-y-0.5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl">{result.project.title}</h2>
              <Link
                to="/projects/$id"
                params={{ id: result.project.id }}
                className="brut-sm bg-primary px-4 py-2 font-display text-xs text-primary-foreground uppercase"
              >
                Open project →
              </Link>
            </div>
            <p className="text-muted-foreground">{result.project.summary}</p>
            <p className="text-xs text-muted-foreground">Balance after build: {result.tokens} tokens</p>

            {demoUrl ? (
              <div className="brut bg-card p-3">
                <p className="font-display text-xs uppercase tracking-widest">Live preview</p>
                <iframe
                  src={demoUrl}
                  title="Generated project preview"
                  className="mt-3 aspect-video w-full bg-white"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No runnable preview was generated.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
