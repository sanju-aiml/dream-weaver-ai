import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudioNav } from "@/components/StudioNav";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tokens")({
  head: () => ({
    meta: [
      { title: "Token Balance — DreamForge AI" },
      { name: "description", content: "Check your DreamForge token balance and usage." },
      { property: "og:title", content: "Token Balance — DreamForge AI" },
      { property: "og:description", content: "Check your DreamForge token balance and usage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tokens,
});

type LedgerRow = { id: string; delta: number; reason: string | null; created_at: string };

function Tokens() {
  const { session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const { data: profile } = await supabase.from("profiles").select("tokens").maybeSingle();
      const { data: rows } = await supabase
        .from("token_ledger")
        .select("id, delta, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setBalance(profile?.tokens ?? 0);
      setHistory((rows ?? []) as unknown as LedgerRow[]);
      setLoading(false);
    }
    void load();
  }, [session]);

  return (
    <main className="min-h-screen">
      <StudioNav email={session?.user.email} tokens={balance ?? undefined} />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl">Token Balance</h1>
        <p className="mt-2 text-muted-foreground">Track how many tokens you have left and what you spent them on.</p>

        {loading ? (
          <p className="mt-10">Loading...</p>
        ) : (
          <>
            <div className="mt-8 brut bg-card p-6">
              <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">Available tokens</p>
              <p className="mt-2 text-6xl font-display">{balance ?? 0}</p>
              <div className="mt-4 flex gap-3 text-sm text-muted-foreground">
                <span>Forge project: 3 tokens</span>
                <span>•</span>
                <span>Research report: 2 tokens</span>
                <span>•</span>
                <span>Code scan: 1 token</span>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-sm">Recent usage</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                      <span className="text-muted-foreground">{h.reason || "Usage"}</span>
                      <div className="flex items-center gap-4">
                      <span className={h.delta < 0 ? "text-destructive" : "text-foreground"}>
                        {h.delta > 0 ? `+${h.delta}` : h.delta}
                      </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-8">
              <Link to="/builder" className="brut-sm inline-block bg-primary px-4 py-2 text-primary-foreground">
                Forge a project
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
