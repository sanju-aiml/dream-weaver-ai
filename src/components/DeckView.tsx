import { useRef } from "react";
import type { Deck } from "@/lib/assets.functions";
import { downloadNodePdf, downloadPng, downloadPptx } from "@/lib/exports";

/** Bold editorial slide + poster preview with PPTX / PNG / PDF exports. */
export function DeckView({ deck }: { deck: Deck }) {
  const posterRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="flex flex-wrap gap-3">
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
            posterRef.current && void downloadNodePdf(posterRef.current, `${deck.title}-poster`)
          }
          className="brut bg-card px-5 py-3 font-display text-sm uppercase"
        >
          Poster PDF
        </button>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-sm tracking-widest uppercase">
          {deck.slides.length + 1} slides
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="brut-sm bg-primary p-5 text-primary-foreground">
            <p className="font-display text-[0.6rem] tracking-[0.3em] uppercase opacity-70">Title</p>
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

      {deck.poster && (
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
              <h3 className="mt-6 font-display text-5xl leading-[0.95]">{deck.poster.headline}</h3>
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
      )}
    </>
  );
}
