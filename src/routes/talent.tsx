import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { ensureProfile } from "@/lib/workspace";
import { listProjects, setProjectShared, type Project } from "@/lib/projects";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/talent")({
  head: () => ({
    meta: [
      { title: "My talent profile — DreamForge AI" },
      {
        name: "description",
        content:
          "Publish your student profile and share your project demos with founders who are hiring.",
      },
      { property: "og:title", content: "My talent profile — DreamForge AI" },
      {
        property: "og:description",
        content: "Share your demos with founders and track who reached out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TalentPage,
});

type Profile = {
  display_name: string;
  headline: string;
  college: string;
  bio: string;
  skills: string[];
  looking_for: string;
  contact: string;
  available: boolean;
};

const EMPTY: Profile = {
  display_name: "",
  headline: "",
  college: "",
  bio: "",
  skills: [],
  looking_for: "Internship",
  contact: "",
  available: true,
};

type Intro = {
  id: string;
  message: string;
  created_at: string;
  project_id: string | null;
};

function TalentPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [skillsText, setSkillsText] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [intros, setIntros] = useState<Intro[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", search: { next: "/talent" } });
  }, [loading, session, navigate]);

  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    void ensureProfile(user.id, user.email).then((t) => setTokens(t ?? 0));
    void supabase
      .from("talent_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setProfile((p) => ({ ...p, display_name: user.email?.split("@")[0] ?? "" }));
          return;
        }
        setProfile({
          display_name: data.display_name,
          headline: data.headline,
          college: data.college,
          bio: data.bio,
          skills: data.skills ?? [],
          looking_for: data.looking_for,
          contact: data.contact,
          available: data.available,
        });
        setSkillsText((data.skills ?? []).join(", "));
      });
    void listProjects()
      .then(setProjects)
      .catch(() => undefined);
    void supabase
      .from("founder_interests")
      .select("id, message, created_at, project_id")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setIntros(data ?? []));
  }, [session?.user?.id]);

  async function save() {
    const user = session?.user;
    if (!user || saving) return;
    setSaving(true);
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from("talent_profiles").upsert({
      user_id: user.id,
      ...profile,
      skills,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save your profile.");
      return;
    }
    setProfile((p) => ({ ...p, skills }));
    toast.success("Profile saved. Founders can find you now.");
  }

  async function toggleShare(project: Project) {
    try {
      await setProjectShared(project.id, !project.shared);
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, shared: !p.shared } : p)),
      );
      toast.success(project.shared ? "Removed from the gallery." : "Demo shared with founders.");
    } catch {
      toast.error("Could not update sharing.");
    }
  }

  if (loading || !session) {
    return (
      <main className="min-h-screen">
        <StudioNav />
        <p className="px-8 py-12">Loading...</p>
      </main>
    );
  }

  const field = "brut-sm w-full bg-background px-3 py-2.5 text-sm outline-none";

  return (
    <main className="min-h-screen">
      <StudioNav email={session.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl sm:text-5xl">My talent profile</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Fill this in once, share the demos you are proud of, and founders browsing the gallery can
          reach out to you.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="brut space-y-3 bg-card p-5">
            <h2 className="font-display text-sm tracking-widest uppercase">Profile</h2>
            <input
              className={field}
              placeholder="Your name"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            />
            <input
              className={field}
              placeholder="One line about you — e.g. Final year CSE, builds study tools"
              value={profile.headline}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
            />
            <input
              className={field}
              placeholder="College"
              value={profile.college}
              onChange={(e) => setProfile({ ...profile, college: e.target.value })}
            />
            <textarea
              className={`${field} resize-none`}
              rows={4}
              placeholder="What you have built and what you enjoy working on"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
            <input
              className={field}
              placeholder="Skills, comma separated"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
            <input
              className={field}
              placeholder="Looking for — internship, part time, freelance"
              value={profile.looking_for}
              onChange={(e) => setProfile({ ...profile, looking_for: e.target.value })}
            />
            <input
              className={field}
              placeholder="How founders reach you (email or link)"
              value={profile.contact}
              onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.available}
                onChange={(e) => setProfile({ ...profile, available: e.target.checked })}
              />
              Open to opportunities right now
            </label>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="brut-sm bg-accent px-5 py-2.5 font-display text-sm text-accent-foreground uppercase disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </section>

          <div className="space-y-6">
            <section className="brut bg-card p-5">
              <h2 className="font-display text-sm tracking-widest uppercase">My demos</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Shared demos appear in the founder gallery with your profile.
              </p>
              <div className="mt-4 space-y-3">
                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No projects yet —{" "}
                    <Link to="/builder" className="underline">
                      forge one first
                    </Link>
                    .
                  </p>
                )}
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 border-2 border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.dream}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleShare(p)}
                      className={`brut-sm shrink-0 px-3 py-1.5 font-display text-[0.65rem] uppercase ${
                        p.shared ? "bg-highlight text-highlight-foreground" : "bg-secondary"
                      }`}
                    >
                      {p.shared ? "Shared" : "Share"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="brut bg-card p-5">
              <h2 className="font-display text-sm tracking-widest uppercase">Founders who wrote</h2>
              {intros.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing yet. Share a demo and keep building.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {intros.map((i) => (
                    <li key={i.id} className="border-2 border-border p-3 text-sm">
                      <p>{i.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
