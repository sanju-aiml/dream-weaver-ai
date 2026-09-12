import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { MentorChat, type ChatMessage } from "@/components/MentorChat";
import mark from "@/assets/dreamforge-mark.png";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — build your dream project | DreamForge AI" },
      {
        name: "description",
        content:
          "Your DreamForge studio: chat with the AI mentor, keep your project history and track tokens.",
      },
      { property: "og:title", content: "DreamForge AI Studio" },
      {
        property: "og:description",
        content: "Chat with your AI mentor and turn a dream into a working project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [tokens, setTokens] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      const [{ data: msgs }, { data: profile }] = await Promise.all([
        supabase
          .from("messages")
          .select("role, content")
          .order("created_at", { ascending: true })
          .limit(60),
        supabase.from("profiles").select("tokens").maybeSingle(),
      ]);
      if (cancelled) return;
      setHistory(
        (msgs ?? []).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      );
      setTokens(profile?.tokens ?? null);
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

  if (loading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-display text-sm tracking-widest uppercase">Loading studio...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={mark} alt="" width={28} height={28} className="h-7 w-7" loading="lazy" />
          <span className="font-display text-sm">DreamForge AI</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          {tokens !== null && (
            <span className="brut-sm bg-highlight px-2 py-1 font-display text-highlight-foreground">
              {tokens} tokens
            </span>
          )}
          <span className="hidden text-muted-foreground sm:inline">{session.user.email}</span>
          <button type="button" onClick={() => void clearHistory()} className="underline">
            Clear chat
          </button>
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

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        {ready && (
          <MentorChat
            initialMessages={history}
            persistForUserId={session.user.id}
            suggestions={[
              "I want a robot that follows me and avoids obstacles",
              "Build a booking website for my dad's clinic",
              "My Python project crashes — help me debug it",
              "Make a final-year project plan with report and PPT outline",
            ]}
            emptyState={
              <div className="space-y-2">
                <h2 className="text-xl">Tell me your dream</h2>
                <p className="text-sm text-muted-foreground">
                  One message is enough. I sharpen it, plan sprint 1, and we start building —
                  explaining every step along the way.
                </p>
              </div>
            }
          />
        )}
      </div>
    </main>
  );
}
