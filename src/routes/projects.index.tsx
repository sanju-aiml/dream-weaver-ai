import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { listProjects, type Project } from "@/lib/projects";
import { getTokens } from "@/lib/workspace";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "My Projects — DreamForge AI" },
      { name: "description", content: "View all your generated projects, code, reports and scans." },
      { property: "og:title", content: "My Projects — DreamForge AI" },
      { property: "og:description", content: "View all your generated projects, code, reports and scans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tokens, setTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProjects(), getTokens()])
      .then(([list, bal]) => {
        setProjects(list);
        setTokens(bal);
      })
      .catch(() => toast.error("Could not load your projects."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen">
      <StudioNav email={session?.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl">My Projects</h1>
            <p className="mt-2 text-muted-foreground">Every dream you forged into code.</p>
          </div>
          <Link
            to="/builder"
            className="brut-sm bg-accent px-4 py-2 font-display text-sm text-accent-foreground uppercase"
          >
            New project
          </Link>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="mt-10 brut bg-card p-8 text-center">
            <p className="text-lg">No projects yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell the mentor your dream and say “build this” to forge your first project.
            </p>
            <Link to="/studio" className="brut-sm mt-4 inline-block bg-primary px-4 py-2 text-primary-foreground">
              Go to mentor
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <article key={p.id} className="brut bg-card p-5">
                <h2 className="text-lg leading-tight">{p.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.dream}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {p.stack.slice(0, 4).map((s) => (
                    <span key={s} className="brut-sm bg-secondary px-2 py-0.5 text-[0.65rem]">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.cost} tokens</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <Link
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="brut-sm mt-4 block bg-primary py-2 text-center font-display text-xs text-primary-foreground uppercase"
                >
                  Open project
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
