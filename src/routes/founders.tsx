import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { ensureProfile } from "@/lib/workspace";
import { listSharedProjects, makeDemoBlobUrl, type Project } from "@/lib/projects";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/founders")({
  head: () => ({
    meta: [
      { title: "Founder dashboard — DreamForge AI" },
      {
        name: "description",
        content:
          "Browse live student demos, read their profiles and connect with the people who built them.",
      },
      { property: "og:title", content: "Founder dashboard — DreamForge AI" },
      {
        property: "og:description",
        content: "Live student demos, matching profiles, one-click intros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Founders,
});

type Talent = {
  user_id: string;
  display_name: string;
  headline: string;
  college: string;
  skills: string[];
  looking_for: string;
  available: boolean;
  contact: string;
  bio: string;
};

function Founders() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [talent, setTalent] = useState<Record<string, Talent>>({});
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", search: { next: "/founders" } });
  }, [loading, session, navigate]);

  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    void ensureProfile(user.id, user.email).then((t) => setTokens(t ?? 0));
    void listSharedProjects()
      .then(setProjects)
      .catch(() => toast.error("Could not load the gallery."));
    void supabase
      .from("talent_profiles")
      .select("*")
      .then(({ data }) => {
        const map: Record<string, Talent> = {};
        for (const row of data ?? []) map[row.user_id] = row as Talent;
        setTalent(map);
      });
    void supabase
      .from("founder_interests")
      .select("project_id")
      .eq("founder_id", user.id)
      .then(({ data }) =>
        setSentTo((data ?? []).map((r) => r.project_id).filter(Boolean) as string[]),
      );
  }, [session?.user?.id]);

  const open = projects.find((p) => p.id === openId) ?? null;

  useEffect(() => {
    if (!open) {
      setDemoUrl(null);
      return;
    }
    const url = makeDemoBlobUrl(open.files);
    setDemoUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open?.id]);

  async function connect(project: Project) {
    const user = session?.user;
    if (!user) return;
    const text = message.trim() || `Loved your ${project.title} demo — can we talk?`;
    const { error } = await supabase.from("founder_interests").insert({
      founder_id: user.id,
      student_id: project.user_id,
      project_id: project.id,
      message: text,
    });
    if (error) {
      toast.error("Could not send that intro.");
      return;
    }
    setSentTo((prev) => [...prev, project.id]);
    setMessage("");
    toast.success("Intro sent to the student.");
  }

  const visible = projects.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const owner = talent[p.user_id];
    return (
      p.title.toLowerCase().includes(q) ||
      p.dream.toLowerCase().includes(q) ||
      p.stack.some((s) => s.toLowerCase().includes(q)) ||
      (owner?.skills ?? []).some((s) => s.toLowerCase().includes(q))
    );
  });

  if (loading || !session) {
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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl sm:text-5xl">Founder dashboard</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Real student demos you can open and click through, with the profile of the person who
          built it. Say hello in one line.
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by project, skill or stack"
          className="brut-sm mt-6 w-full max-w-md bg-background px-3 py-2.5 text-sm outline-none"
        />

        {visible.length === 0 ? (
          <div className="mt-10 brut bg-card p-8 text-center">
            <p className="text-lg">No shared demos yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Students publish demos from their talent profile.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {visible.map((p) => {
              const owner = talent[p.user_id];
              return (
                <article key={p.id} className="brut bg-card p-5">
                  <h2 className="text-lg leading-tight">{p.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.dream}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.stack.slice(0, 4).map((s) => (
                      <span key={s} className="brut-sm bg-secondary px-2 py-0.5 text-[0.65rem]">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 border-t-2 border-border pt-3 text-xs">
                    <p className="font-display">{owner?.display_name || "Student builder"}</p>
                    <p className="text-muted-foreground">
                      {owner?.headline || "Profile not filled in yet"}
                    </p>
                    {owner?.college && <p className="text-muted-foreground">{owner.college}</p>}
                    {owner?.looking_for && (
                      <p className="mt-1 text-accent">Looking for: {owner.looking_for}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === p.id ? null : p.id)}
                    className="brut-sm mt-4 w-full bg-primary py-2 font-display text-xs text-primary-foreground uppercase"
                  >
                    {openId === p.id ? "Hide demo" : "Open demo"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {open && (
          <div className="mt-8 brut bg-card p-5">
            <h2 className="text-2xl">{open.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{open.summary}</p>
            {demoUrl ? (
              <iframe
                src={demoUrl}
                title={`${open.title} demo`}
                className="mt-4 aspect-video w-full bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                This project has no runnable page to preview.
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Say hello to ${talent[open.user_id]?.display_name || "the builder"}`}
                className="brut-sm bg-background px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void connect(open)}
                disabled={sentTo.includes(open.id) || open.user_id === session.user.id}
                className="brut-sm bg-accent px-5 py-2.5 font-display text-sm text-accent-foreground uppercase disabled:opacity-40"
              >
                {open.user_id === session.user.id
                  ? "Your project"
                  : sentTo.includes(open.id)
                    ? "Intro sent"
                    : "Connect"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
