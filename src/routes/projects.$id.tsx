import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { StudioNav } from "@/components/StudioNav";
import { ScanReport } from "@/components/ScanReport";
import { useSession } from "@/lib/useSession";
import { getProject, type Project, makeDemoBlobUrl } from "@/lib/projects";
import { getTokens } from "@/lib/workspace";
import { scanCode, type ScanFinding } from "@/lib/scans.functions";

function guessLanguage(path: string) {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  return "javascript";
}

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Project — DreamForge AI" },
      { name: "description", content: "View your generated project code, preview and report." },
      { property: "og:title", content: "Project — DreamForge AI" },
      { property: "og:description", content: "View your generated project code, preview and report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = useParams({ from: "/projects/$id" });
  const { session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState(0);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProject(id), getTokens()])
      .then(([p, bal]) => {
        if (!p) {
          toast.error("Project not found.");
          return;
        }
        setProject(p);
        setTokens(bal);
        const url = makeDemoBlobUrl(p.files);
        setDemoUrl(url);
      })
      .finally(() => setLoading(false));

    return () => {
      if (demoUrl) URL.revokeObjectURL(demoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <StudioNav email={session?.user.email} tokens={tokens ?? undefined} />
        <p className="px-8 py-12">Loading project...</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen">
        <StudioNav email={session?.user.email} tokens={tokens ?? undefined} />
        <div className="px-8 py-12">
          <p>Project not found.</p>
          <Link to="/projects" className="underline">
            Back to My Projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <StudioNav email={session?.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl">{project.title}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">{project.summary}</p>
          </div>
          <span className="brut-sm bg-highlight px-2 py-1 font-display text-xs text-highlight-foreground">
            {project.cost} tokens
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-1">
          {project.stack.map((s) => (
            <span key={s} className="brut-sm bg-secondary px-2 py-0.5 text-[0.65rem]">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="brut bg-card p-4">
            <h2 className="text-sm">Preview</h2>
            {demoUrl ? (
              <iframe
                src={demoUrl}
                title="Project preview"
                className="mt-3 aspect-video w-full bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No runnable preview file.</p>
            )}
          </section>

          <section className="brut bg-card p-4">
            <h2 className="text-sm">Files</h2>
            <div className="mt-3 flex flex-wrap gap-1 border-b-2 border-border pb-3">
              {project.files.map((f, i) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setActiveFile(i)}
                  className={`brut-sm px-2 py-1 text-[0.65rem] ${activeFile === i ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {f.path}
                </button>
              ))}
            </div>
            <pre className="mt-3 max-h-[360px] overflow-auto bg-[#0a0a0a] p-3 text-xs text-[#e8e8e8]">
              <code>{project.files[activeFile]?.code ?? ""}</code>
            </pre>
          </section>
        </div>

        <section className="mt-6 brut bg-card p-4">
          <h2 className="text-sm">Sprints</h2>
          <ol className="mt-3 space-y-3">
            {project.sprints.map((sprint) => (
              <li key={sprint.name}>
                <h3 className="text-sm normal-case">{sprint.name}</h3>
                <p className="text-sm text-muted-foreground">{sprint.goal}</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                  {sprint.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <Link to="/projects" className="underline">
            ← All projects
          </Link>
        </section>
      </div>
    </main>
  );
}
