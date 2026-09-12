import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import mark from "@/assets/dreamforge-mark.png";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — DreamForge AI" },
      {
        name: "description",
        content:
          "Create your DreamForge AI account to save projects, mentor chats and token balance.",
      },
      { property: "og:title", content: "Sign in — DreamForge AI" },
      {
        property: "og:description",
        content: "Save your dream projects, mentor chats and tokens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  /** Where to land after signing in: the requested page, else straight into the builder. */
  const dest = (next && next.startsWith("/") ? next : "/builder") as "/builder";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void navigate({ to: dest });
    });
  }, [navigate, dest]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${dest}`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          void navigate({ to: dest });
        } else {
          toast.success("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: dest });
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth?next=${encodeURIComponent(dest)}`,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: dest });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <img src={mark} alt="" width={32} height={32} className="h-8 w-8" loading="lazy" />
          <span className="font-display text-lg">DreamForge AI</span>
        </Link>

        <div className="brut bg-card p-6">
          <h1 className="text-2xl">{mode === "signup" ? "Start forging" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "New accounts get 5 free tokens and a saved mentor history."
              : "Pick up your projects and mentor chats where you left them."}
          </p>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            className="brut-sm mt-6 w-full bg-secondary px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs tracking-widest text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="brut-sm w-full bg-background px-3 py-3 text-sm outline-none"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="brut-sm w-full bg-background px-3 py-3 text-sm outline-none"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="brut-sm w-full bg-background px-3 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="brut-sm w-full bg-accent px-4 py-3 font-display text-sm text-accent-foreground uppercase disabled:opacity-50"
            >
              {busy ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-4 text-sm underline underline-offset-4"
          >
            {mode === "signup" ? "I already have an account" : "I need an account"}
          </button>
        </div>
      </div>
    </main>
  );
}
