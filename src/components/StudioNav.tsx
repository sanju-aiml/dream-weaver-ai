import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import mark from "@/assets/dreamforge-mark.png";

const LINKS = [
  { to: "/studio", label: "Mentor" },
  { to: "/builder", label: "Builder" },
  { to: "/project-studio", label: "Project Studio" },
  { to: "/research", label: "Research" },
  { to: "/tokens", label: "Tokens" },
] as const;

export function StudioNav({ email, tokens }: { email?: string | null; tokens?: number | null }) {
  const navigate = useNavigate();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-4 py-3 sm:px-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={mark} alt="" width={28} height={28} className="h-7 w-7" loading="lazy" />
          <span className="font-display text-sm">DreamForge AI</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 font-display text-[0.7rem] tracking-widest uppercase">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-accent" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {tokens !== null && tokens !== undefined && (
          <Link
            to="/tokens"
            className="brut-sm bg-highlight px-2 py-1 font-display text-highlight-foreground"
          >
            {tokens} tokens
          </Link>
        )}
        {email && <span className="hidden text-muted-foreground sm:inline">{email}</span>}
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/" });
          }}
          className="underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
