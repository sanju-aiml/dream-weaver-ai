import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Spends tokens for an action. Returns the new balance, or null if it failed. */
export async function spendTokens(amount: number, reason: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("spend_tokens", {
    _amount: amount,
    _reason: reason,
  });
  if (error) {
    toast.error("Could not check your token balance.");
    return null;
  }
  if (typeof data !== "number" || data < 0) {
    toast.error("You are out of tokens. Top up to keep building.");
    return null;
  }
  return data;
}

/** Drops a note into the mentor chat history so the conversation stays connected. */
export async function noteToMentor(userId: string, content: string) {
  await supabase.from("messages").insert({ user_id: userId, role: "assistant", content });
}

export async function getTokens(): Promise<number | null> {
  const { data } = await supabase.from("profiles").select("tokens").maybeSingle();
  return data?.tokens ?? null;
}

/** Makes sure the signed-in user has a profile row with a starting token balance. */
export async function ensureProfile(userId: string, email?: string | null): Promise<number | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return existing.tokens;
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email: email ?? null, tokens: 5 })
    .select("tokens")
    .maybeSingle();
  if (error) return null;
  return data?.tokens ?? null;
}
