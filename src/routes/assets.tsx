import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { getTokens } from "@/lib/workspace";
import { generateDeck, type Deck } from "@/lib/assets.functions";
import { downloadNodePdf, downloadPng, downloadPptx } from "@/lib/exports";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Slides & Poster — DreamForge AI" },
      {
        name: "description",
        content:
          "Turn your project into a bold editorial slide deck and conference poster — download as PPTX, PNG or PDF.",
      },
      { property: "og:title", content: "Slides & Poster — DreamForge AI" },
      { property: "og:description", content: "PPTX, PNG and PDF exports for your project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assets,
});

function Assets() {
  const { session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const make = useServerFn(generateDeck);

  useEffect(() => {
    if (!session) return;
    getTokens()
      .then(setTokens)
      .catch(() => setTokens(null));
  }, [session]);

  async function submit() {
    if (topic.trim().length < 3) {
      toast.error("Describe your project first.");
      return;
    }
    setBusy(true);
    setDeck(null);
    try {
      const res = await make({ data: { topic: topic.trim() } });
      setDeck(res.deck);
      setTokens(res.tokens);
      toast.success(`Deck and poster ready — ${res.cost} tokens used.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(
        message.includes("insufficient") ? "Not enough tokens for that." : message.slice(0, 160),
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
          <h1 className="text-3xl">Sign in to make slides</h1>
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
        <h1 className="text-4xl sm:text-5xl">Slides &amp; Poster</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Same bold editorial look as this site — cream paper, charcoal ink, vermilion accent. Export
          as PPTX, PNG or PDF.
        </p>

        <div className="brut mt-8 bg-card p-5">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="e.g. AI smart study assistant for college students: personalised plans, summaries, quizzes, flashcards, progress tracking and mentoring"
            className="w-full border-2 border-border bg-background p-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="brut mt-4 bg-primary px-5 py-3 font-display text-sm text-primary-foreground uppercase disabled:opacity-60"
          >
            {busy ? "Designing…" : "Generate slides + poster (2 tokens)"}
          </button>
        </div>

        {deck && (
          <>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void downloadPptx(deck)}
                className="brut bg-accent px-5 py-3 font-display text-sm text-accent-foreground uppercase"
              >
                Download PPTX
              </button>
              <button
                type="button"
                onClick={() =>
                  posterRef.current && void downloadPng(posterRef.current, `${deck.title}-poster`)
                }
                className="brut bg-highlight px-5 py-3 font-display text-sm text-highlight-foreground uppercase"
              >
                Poster PNG
              </button>
              <button
                type="button"
                onClick={() =>
                  posterRef.current &&
                  void downloadNodePdf(posterRef.current, `${deck.title}-poster`)
                }
                className="brut bg-card px-5 py-3 font-display text-sm uppercase"
              >
                Poster PDF
              </button>
            </div>

            <section className="mt-10">
              <h2 className="font-display text-sm tracking-widest uppercase">
                {deck.slides.length + 1} slides
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <article className="brut-sm bg-primary p-5 text-primary-foreground">
                  <p className="font-display text-[0.6rem] tracking-[0.3em] uppercase opacity-70">
                    Title
                  </p>
                  <h3 className="mt-3 text-2xl">{deck.title}</h3>
                  <p className="mt-2 text-sm opacity-80">{deck.subtitle}</p>
                </article>
                {deck.slides.map((s, i) => (
                  <article key={i} className="brut-sm bg-card p-5">
                    <p className="font-display text-[0.6rem] tracking-[0.3em] text-accent uppercase">
                      Slide {i + 2}
                    </p>
                    <h3 className="mt-3 text-lg">{s.heading}</h3>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {(s.bullets ?? []).map((b, j) => (
                        <li key={j}>— {b}</li>
                      ))}
                    </ul>
                    {s.notes && (
                      <p className="mt-3 border-t-2 border-border pt-2 text-xs text-muted-foreground">
                        Say: {s.notes}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <h2 className="font-display text-sm tracking-widest uppercase">Poster</h2>
              <div className="mt-4 overflow-auto">
                <div
                  ref={posterRef}
                  className="w-[720px] bg-background p-10 text-foreground"
                  style={{ aspectRatio: "1 / 1.414" }}
                >
                  <p className="font-display text-xs tracking-[0.4em] text-accent uppercase">
                    DreamForge AI
                  </p>
                  <h3 className="mt-6 font-display text-5xl leading-[0.95]">
                    {deck.poster.headline}
                  </h3>
                  <p className="mt-4 text-lg">{deck.poster.tagline}</p>
                  <div className="mt-8 grid gap-6 border-t-4 border-foreground pt-6">
                    <div>
                      <p className="font-display text-xs tracking-[0.3em] uppercase">Problem</p>
                      <p className="mt-2 text-sm">{deck.poster.problem}</p>
                    </div>
                    <div>
                      <p className="font-display text-xs tracking-[0.3em] uppercase">Solution</p>
                      <p className="mt-2 text-sm">{deck.poster.solution}</p>
                    </div>
                    <div>
                      <p className="font-display text-xs tracking-[0.3em] uppercase">Results</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {(deck.poster.results ?? []).map((r, i) => (
                          <li key={i}>— {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="mt-10 border-t-4 border-accent pt-4 font-display text-xs tracking-[0.2em] uppercase">
                    {deck.poster.footer}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
