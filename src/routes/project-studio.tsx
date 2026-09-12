import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { getTokens } from "@/lib/workspace";

export const Route = createFileRoute("/project-studio")({
  head: () => ({
    meta: [
      { title: "Project Studio — DreamForge AI" },
      { name: "description", content: "Upload your own code, run error scans, and view fixes from your mentor." },
      { property: "og:title", content: "Project Studio — DreamForge AI" },
      { property: "og:description", content: "Upload your own code, run error scans, and view fixes from your mentor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectStudio,
});

function ProjectStudio() {
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
        <h1 className="text-4xl">Project Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your own code or paste an error log. The mentor scans it, explains the issue, and suggests a
          fix.
        </p>

        <div className="mt-10 brut bg-card p-6 text-center">
          <p className="text-lg">Coming next: error scans linked to your mentor chat.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            For now, go to the mentor and paste your code or error message.
          </p>
          <Link to="/studio" className="brut-sm mt-4 inline-block bg-primary px-4 py-2 text-primary-foreground">
            Open mentor
          </Link>
        </div>
      </div>
    </main>
  );
}
