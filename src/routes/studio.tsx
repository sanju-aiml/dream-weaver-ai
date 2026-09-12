import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { MentorChat, type ChatMessage } from "@/components/MentorChat";
import { StudioNav } from "@/components/StudioNav";
import { DeckView } from "@/components/DeckView";
import { ScanReport } from "@/components/ScanReport";
import { listProjects, projectBrief, type Project } from "@/lib/projects";
import { generateDeck, type Deck } from "@/lib/assets.functions";
import { runResearch } from "@/lib/research.functions";
import { scanCode, type ScanFinding } from "@/lib/scans.functions";
import { forgeProject } from "@/lib/projects.functions";
import { downloadTextPdf } from "@/lib/exports";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — mentor chat with every tool | DreamForge AI" },
      {
        name: "description",
        content:
          "Chat with your AI mentor and run the tools right there: build the project, write the academic report, design slides and poster, scan for errors.",
      },
      { property: "og:title", content: "DreamForge AI Studio" },
      {
        property: "og:description",
        content: "One mentor chat that builds, writes, designs and debugs your project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type Output =
  | { kind: "report"; title: string; content: string }
  | { kind: "deck"; deck: Deck }
  | {
      kind: "scan";
      filename: string;
      summary: string;
      findings: ScanFinding[];
      original: string;
      fixed: string;
    }
  | { kind: "project"; project: Project };

function Studio() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [tokens, setTokens] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const pushRef = useRef<((m: ChatMessage) => void) | null>(null);

  const makeDeck = useServerFn(generateDeck);
  const research = useServerFn(runResearch);
  const scan = useServerFn(scanCode);
  const forge = useServerFn(forgeProject);

  const project = projects.find((p) => p.id === projectId) ?? null;

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      const [{ data: msgs }, { data: profile }, list] = await Promise.all([
        supabase
          .from("messages")
          .select("role, content")
          .order("created_at", { ascending: true })
          .limit(60),
        supabase.from("profiles").select("tokens").maybeSingle(),
        listProjects().catch(() => [] as Project[]),
      ]);
      if (cancelled) return;
      setHistory(
        (msgs ?? []).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      );
      setTokens(profile?.tokens ?? null);
      setProjects(list);
      const preferred =
        list.find((p) => /study assistant/i.test(p.title))?.id ?? list[0]?.id ?? "";
      setProjectId(preferred);
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function clearHistory() {
    if (!session) return;
    const { error } = await supabase.from("messages").delete().eq("user_id", session.user.id);
    if (error) {
      toast.error("Could not clear the chat.");
      return;
    }
    setHistory([]);
    toast.success("Fresh start.");
  }

  function note(content: string) {
    pushRef.current?.({ role: "assistant", content });
  }

  function fail(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : fallback;
    toast.error(
      message.includes("insufficient") ? "Not enough tokens for that." : message.slice(0, 160),
    );
  }

  async function run(label: string, job: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    try {
      await job();
    } finally {
      setBusy(null);
    }
  }

  const topic = project ? projectBrief(project) : "";

  async function buildFromChat() {
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content;
    const dream = lastUser?.trim();
    if (!dream || dream.length < 6) {
      toast.error("Tell the mentor your dream first, then press Build.");
      return;
    }
    await run("build", async () => {
      try {
        const res = await forge({ data: { dream } });
        setTokens(res.tokens);
        const list = await listProjects().catch(() => [] as Project[]);
        setProjects(list);
        setProjectId(res.project.id);
        const saved = list.find((p) => p.id === res.project.id);
        if (saved) setOutput({ kind: "project", project: saved });
        note(
          `**Built ${res.project.title}** — saved to My Projects (3 tokens). ${res.project.summary}`,
        );
        toast.success("Project built and saved.");
      } catch (err) {
        fail(err, "Could not build the project.");
      }
    });
  }

  async function writeReport() {
    if (!project) {
      toast.error("Pick a project first.");
      return;
    }
    await run("report", async () => {
      try {
        const res = await research({
          data: { kind: "paper", topic: project.title, projectId: project.id },
        });
        setTokens(res.tokens);
        setOutput({ kind: "report", title: project.title, content: res.content });
        note(
          `**Academic report written for ${project.title}** — abstract, methodology, results and references. ${res.cost} tokens. It is on the right, downloadable as a PDF.`,
        );
      } catch (err) {
        fail(err, "Could not write the report.");
      }
    });
  }

  async function designDeck() {
    if (!project) {
      toast.error("Pick a project first.");
      return;
    }
    await run("deck", async () => {
      try {
        const res = await makeDeck({ data: { topic, projectId: project.id } });
        setTokens(res.tokens);
        setOutput({ kind: "deck", deck: res.deck });
        note(
          `**Slides and poster designed for ${project.title}** — ${res.deck.slides.length + 1} slides in the bold editorial style, plus a poster. ${res.cost} tokens. Export as PPTX, PNG or PDF on the right.`,
        );
      } catch (err) {
        fail(err, "Could not design the deck.");
      }
    });
  }

  async function runScan() {
    if (!project) {
      toast.error("Pick a project first.");
      return;
    }
    const file =
      project.files.find((f) => f.path === "index.html") ?? project.files[0] ?? null;
    if (!file) {
      toast.error("That project has no files to scan.");
      return;
    }
    await run("scan", async () => {
      try {
        const res = await scan({
          data: {
            filename: file.path,
            language: file.language || "text",
            code: file.code,
            projectId: project.id,
          },
        });
        setTokens(res.tokens);
        setOutput({
          kind: "scan",
          filename: file.path,
          summary: res.summary,
          findings: res.findings,
          original: file.code,
          fixed: res.fixedCode,
        });
        note(
          `**Error scan of ${file.path}** — ${res.summary} ${res.findings.length} finding(s), with a before/after on the right. ${res.cost} token.`,
        );
      } catch (err) {
        fail(err, "Could not scan the project.");
      }
    });
  }

  if (loading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-display text-sm tracking-widest uppercase">Loading studio...</p>
      </main>
    );
  }

  const toolbar = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="project" className="font-display text-[0.65rem] tracking-widest uppercase">
          Working on
        </label>
        <select
          id="project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="brut-sm max-w-[240px] bg-background px-2 py-1 text-xs"
        >
          <option value="">No project yet</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {project && (
          <Link
            to="/projects/$id"
            params={{ id: project.id }}
            className="text-[0.7rem] underline underline-offset-4"
          >
            Open
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { key: "build", label: busy === "build" ? "Building…" : "Build project (3)", onClick: buildFromChat },
          { key: "report", label: busy === "report" ? "Writing…" : "Academic report (3)", onClick: writeReport },
          { key: "deck", label: busy === "deck" ? "Designing…" : "Slides + poster (2)", onClick: designDeck },
          { key: "scan", label: busy === "scan" ? "Scanning…" : "Error scan (1)", onClick: runScan },
        ].map((tool) => (
          <button
            key={tool.key}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void tool.onClick()}
            className="brut-sm bg-card px-3 py-2 font-display text-[0.65rem] uppercase disabled:opacity-50"
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col">
      <StudioNav email={session.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="brut flex min-h-[70vh] flex-col overflow-hidden bg-card">
          <div className="flex items-center justify-between border-b-2 border-border bg-primary px-4 py-2 text-primary-foreground">
            <span className="font-display text-xs tracking-widest uppercase">Mentor</span>
            <button type="button" onClick={() => void clearHistory()} className="text-xs underline">
              Clear chat
            </button>
          </div>
          {ready && (
            <MentorChat
              className="min-h-0"
              initialMessages={history}
              persistForUserId={session.user.id}
              pushRef={pushRef}
              toolbar={toolbar}
              {...(topic ? { context: topic } : {})}
              suggestions={[
                "AI Smart Study Assistant for college students with plans, summaries, quizzes and flashcards",
                "My Python project crashes — help me debug it",
                "Plan my final-year project with report and PPT",
              ]}
              emptyState={
                <div className="space-y-2">
                  <h2 className="text-xl">Tell me your dream</h2>
                  <p className="text-sm text-muted-foreground">
                    One message is enough. Then press a tool below: I build the project, write the
                    academic report, design the slides and poster, or scan your code.
                  </p>
                </div>
              }
            />
          )}
        </div>

        <div className="min-w-0">
          {!output && (
            <div className="brut bg-card p-6">
              <h2 className="text-xl">Workbench</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything a tool makes lands here — report, slides, poster and before/after fixes.
                Pick a project above, then press a tool in the chat.
              </p>
            </div>
          )}

          {output?.kind === "report" && (
            <div className="brut bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-sm tracking-widest uppercase">Academic report</h2>
                <button
                  type="button"
                  onClick={() => void downloadTextPdf(output.content, `${output.title}-report`)}
                  className="brut-sm bg-accent px-3 py-2 font-display text-[0.65rem] text-accent-foreground uppercase"
                >
                  Download PDF
                </button>
              </div>
              <div className="markdown-body mt-4 max-h-[70vh] space-y-3 overflow-y-auto text-sm [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_li]:ml-4 [&_li]:list-disc [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-1 [&_th]:border [&_th]:border-border [&_th]:p-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {output?.kind === "deck" && (
            <div className="brut bg-card p-6">
              <DeckView deck={output.deck} />
            </div>
          )}

          {output?.kind === "scan" && (
            <ScanReport
              summary={output.summary}
              findings={output.findings}
              originalCode={output.original}
              fixedCode={output.fixed}
              filename={output.filename}
            />
          )}

          {output?.kind === "project" && (
            <div className="brut bg-card p-6">
              <h2 className="text-xl">{output.project.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{output.project.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Cost: {output.project.cost} tokens
              </p>
              <Link
                to="/projects/$id"
                params={{ id: output.project.id }}
                className="brut-sm mt-4 inline-block bg-primary px-4 py-2 font-display text-[0.7rem] text-primary-foreground uppercase"
              >
                Open live preview →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
