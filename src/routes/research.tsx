import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { getTokens } from "@/lib/workspace";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Reports — DreamForge AI" },
      { name: "description", content: "Find papers, generate literature reviews and project reports with your AI mentor." },
      { property: "og:title", content: "Research & Reports — DreamForge AI" },
      { property: "og:description", content: "Find papers, generate literature reviews and project reports with your AI mentor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Research,
});

function Research() {
  const { session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    getTokens().then(setTokens).catch(() => setTokens(null));
  }, [session]);

  return (
    <main className="min-h-screen">
      <StudioNav email={session?.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl">Research & Reports</h1>
        <p className="mt-2 text-muted-foreground">
          Module 4: paper finder, literature review, and formatted project reports — all connected to your
          mentor chat.
        </p>

        <div className="mt-10 brut bg-card p-6 text-center">
          <p className="text-lg">Research mode is coming next.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the mentor to draft a literature review or report outline for now.
          </p>
          <Link to="/studio" className="brut-sm mt-4 inline-block bg-primary px-4 py-2 text-primary-foreground">
            Ask the mentor
          </Link>
        </div>
      </div>
    </main>
  );
}
