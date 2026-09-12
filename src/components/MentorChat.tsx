import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type MentorChatProps = {
  initialMessages?: ChatMessage[];
  persistForUserId?: string | null;
  suggestions?: string[];
  emptyState?: React.ReactNode;
  className?: string;
  /** Extra situation context (current project, scan results...) sent with each message. */
  context?: string;
  /** Tool buttons rendered above the composer. */
  toolbar?: React.ReactNode;
  /** Filled with a function that appends a message into the transcript. */
  pushRef?: React.MutableRefObject<((message: ChatMessage) => void) | null>;
};

export function MentorChat({
  initialMessages = [],
  persistForUserId = null,
  suggestions = [],
  emptyState,
  className = "",
  context,
}: MentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages.length === 0 ? "empty" : initialMessages[0]?.content]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function persist(role: "user" | "assistant", content: string) {
    if (!persistForUserId) return;
    await supabase.from("messages").insert({ user_id: persistForUserId, role, content });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    void persist("user", trimmed);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "The mentor could not answer right now.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setMessages([...next, { role: "assistant", content: "" }]);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: answer }]);
      }

      if (answer.trim()) {
        void persist("assistant", answer);
      } else {
        setMessages([
          ...next,
          { role: "assistant", content: "_I went quiet there. Ask me again?_" },
        ]);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
      toast.error((error as Error).message);
      setMessages(next);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
        {messages.length === 0 ? (
          <div className="space-y-5">
            {emptyState}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="brut-sm bg-card px-3 py-2 text-left text-sm transition-transform hover:-translate-y-0.5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="brut-sm max-w-[85%] bg-primary px-4 py-2 text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="max-w-[95%] text-[0.95rem] leading-relaxed">
                <p className="mb-2 font-display text-xs tracking-widest text-accent uppercase">
                  Mentor
                </p>
                <div className="markdown-body space-y-3 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:border-2 [&_pre]:border-border [&_pre]:bg-secondary [&_pre]:p-3 [&_strong]:font-semibold">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
                {streaming && i === messages.length - 1 && (
                  <span className="mt-2 inline-block h-4 w-2 animate-pulse bg-accent align-middle" />
                )}
              </div>
            ),
          )
        )}
        {streaming && messages[messages.length - 1]?.role === "user" && (
          <p className="animate-pulse font-display text-xs tracking-widest text-muted-foreground uppercase">
            Thinking it through...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="rule-top flex items-end gap-2 bg-card p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          placeholder="I want a robot that follows me and avoids obstacles..."
          className="min-h-[56px] flex-1 resize-none bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="brut-sm flex h-10 w-10 items-center justify-center bg-secondary"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="brut-sm flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </form>
    </div>
  );
}
