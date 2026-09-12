import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Circle, GraduationCap } from "lucide-react";
import { StudioNav } from "@/components/StudioNav";
import { MentorChat } from "@/components/MentorChat";
import { useSession } from "@/lib/useSession";
import { ensureProfile } from "@/lib/workspace";
import { listProjects, type Project } from "@/lib/projects";
import {
  courseCompletion,
  listCourses,
  saveProgress,
  type Course,
  type CourseProgress,
} from "@/lib/courses";
import { generateCourse } from "@/lib/courses.functions";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — DreamForge AI" },
      {
        name: "description",
        content:
          "Turn your project into a real college course with lessons, quizzes and progress tracking.",
      },
      { property: "og:title", content: "Courses — DreamForge AI" },
      {
        property: "og:description",
        content: "Lessons, quizzes and progress built around the project you are making.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Courses,
});

function Courses() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const build = useServerFn(generateCourse);

  const [tokens, setTokens] = useState<number | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [subject, setSubject] = useState("");
  const [projectId, setProjectId] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", search: { next: "/courses" } });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session?.user) return;
    void ensureProfile(session.user.id, session.user.email).then((t) => setTokens(t ?? 0));
    void listProjects()
      .then(setProjects)
      .catch(() => undefined);
    void listCourses()
      .then((rows) => {
        setCourses(rows);
        setActiveId((id) => id ?? rows[0]?.id ?? null);
      })
      .catch(() => toast.error("Could not load your courses."));
  }, [session?.user?.id]);

  const active = useMemo(
    () => courses.find((c) => c.id === activeId) ?? null,
    [courses, activeId],
  );
  const lesson = active?.lessons[lessonIndex] ?? null;

  async function create() {
    const topic = subject.trim();
    if (!topic || working) return;
    if ((tokens ?? 0) < 2) {
      toast.error("You need 2 tokens to build a course.");
      return;
    }
    setWorking(true);
    try {
      const res = await build({
        data: { subject: topic, ...(projectId ? { projectId } : {}) },
      });
      setTokens(res.tokens);
      const rows = await listCourses();
      setCourses(rows);
      setActiveId(res.courseId);
      setLessonIndex(0);
      setAnswers({});
      setSubject("");
      toast.success(`Course ready: ${res.title}`);
    } catch (error) {
      toast.error((error as Error).message || "Could not build the course.");
    } finally {
      setWorking(false);
    }
  }

  async function markComplete() {
    if (!active) return;
    const score = active.lessons[lessonIndex]?.quiz.reduce(
      (total, q, i) => total + (answers[i] === q.answer ? 1 : 0),
      0,
    );
    const next: CourseProgress = {
      completed: Array.from(new Set([...active.progress.completed, lessonIndex])),
      scores: { ...active.progress.scores, [String(lessonIndex)]: score ?? 0 },
    };
    setCourses((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, progress: next } : c)),
    );
    try {
      await saveProgress(active.id, next);
      toast.success("Lesson marked complete.");
    } catch {
      toast.error("Could not save your progress.");
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

  return (
    <main className="min-h-screen">
      <StudioNav email={session.user.email} tokens={tokens ?? undefined} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <h1 className="text-4xl sm:text-5xl">Courses</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Learn the thing you are building. Five lessons, quizzes after each one, progress saved as
          you go — and the mentor knows which lesson you are on.
        </p>

        <div className="mt-8 brut bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you want to learn? e.g. Build and ship StudySpark"
              className="brut-sm bg-background px-3 py-3 text-sm outline-none"
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="brut-sm bg-background px-3 py-3 text-sm outline-none"
            >
              <option value="">No project linked</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void create()}
              disabled={working || subject.trim().length < 3}
              className="brut-sm bg-accent px-5 py-3 font-display text-sm text-accent-foreground uppercase disabled:opacity-40"
            >
              {working ? "Building..." : "Build course · 2"}
            </button>
          </div>
        </div>

        {courses.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setLessonIndex(0);
                  setAnswers({});
                }}
                className={`brut-sm px-3 py-2 text-left text-xs ${
                  c.id === activeId ? "bg-highlight text-highlight-foreground" : "bg-secondary"
                }`}
              >
                <span className="font-display">{c.title}</span>
                <span className="ml-2 opacity-70">{courseCompletion(c)}%</span>
              </button>
            ))}
          </div>
        )}

        {active && lesson && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-5">
              <div className="brut bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl">{active.title}</h2>
                  <span className="brut-sm bg-secondary px-2 py-1 text-xs">
                    {courseCompletion(active)}% done
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{active.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {active.lessons.map((l, i) => {
                    const done = active.progress.completed.includes(i);
                    return (
                      <button
                        key={l.title + i}
                        type="button"
                        onClick={() => {
                          setLessonIndex(i);
                          setAnswers({});
                        }}
                        className={`brut-sm flex items-center gap-2 px-3 py-1.5 text-xs ${
                          i === lessonIndex ? "bg-primary text-primary-foreground" : "bg-background"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                        {i + 1}. {l.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <article className="brut bg-card p-5">
                <p className="font-display text-xs tracking-widest text-accent uppercase">
                  Lesson {lessonIndex + 1}
                </p>
                <h3 className="mt-2 text-xl">{lesson.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{lesson.objective}</p>
                <div className="prose prose-sm mt-4 max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
                </div>
                <ul className="mt-4 space-y-1 text-sm">
                  {lesson.keyPoints.map((k) => (
                    <li key={k} className="flex gap-2">
                      <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {k}
                    </li>
                  ))}
                </ul>
              </article>

              <section className="brut bg-card p-5">
                <h3 className="font-display text-sm tracking-widest uppercase">Quiz</h3>
                <div className="mt-4 space-y-5">
                  {lesson.quiz.map((q, qi) => {
                    const picked = answers[qi];
                    return (
                      <div key={q.question}>
                        <p className="text-sm font-semibold">
                          {qi + 1}. {q.question}
                        </p>
                        <div className="mt-2 grid gap-2">
                          {q.options.map((opt, oi) => {
                            const chosen = picked === oi;
                            const correct = picked !== undefined && oi === q.answer;
                            const wrong = chosen && oi !== q.answer;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                                className={`brut-sm px-3 py-2 text-left text-sm ${
                                  correct
                                    ? "bg-highlight text-highlight-foreground"
                                    : wrong
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-background"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {picked !== undefined && (
                          <p className="mt-2 text-xs text-muted-foreground">{q.explain}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => void markComplete()}
                  className="brut-sm mt-5 bg-accent px-4 py-2 font-display text-xs text-accent-foreground uppercase"
                >
                  Mark lesson complete
                </button>
              </section>
            </div>

            <div className="brut flex h-[620px] flex-col overflow-hidden bg-card">
              <div className="border-b-2 border-border bg-primary px-4 py-2 font-display text-xs tracking-widest text-primary-foreground uppercase">
                Mentor · this lesson
              </div>
              <MentorChat
                className="min-h-0"
                persistForUserId={session.user.id}
                context={`The student is studying the course "${active.title}", lesson ${
                  lessonIndex + 1
                }: ${lesson.title}. Objective: ${lesson.objective}. Lesson notes: ${lesson.content.slice(
                  0,
                  900,
                )}`}
                suggestions={[
                  "Explain this lesson again, simpler",
                  "Give me a worked example",
                  "Quiz me harder on this",
                ]}
                emptyState={
                  <p className="text-sm text-muted-foreground">
                    Stuck on this lesson? Ask and I will walk you through it step by step.
                  </p>
                }
              />
            </div>
          </div>
        )}

        {courses.length === 0 && (
          <div className="mt-10 brut bg-card p-8 text-center">
            <p className="text-lg">No courses yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick one of your projects above and build the course that teaches it.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
