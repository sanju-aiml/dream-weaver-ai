import { supabase } from "@/integrations/supabase/client";

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explain: string;
};

export type Lesson = {
  title: string;
  objective: string;
  content: string;
  keyPoints: string[];
  quiz: QuizQuestion[];
};

export type CourseProgress = {
  completed: number[];
  scores: Record<string, number>;
};

export type Course = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  subject: string;
  summary: string;
  lessons: Lesson[];
  progress: CourseProgress;
  created_at: string;
};

function normalise(row: unknown): Course {
  const raw = row as Course;
  return {
    ...raw,
    lessons: Array.isArray(raw.lessons) ? raw.lessons : [],
    progress: {
      completed: Array.isArray(raw.progress?.completed) ? raw.progress.completed : [],
      scores: raw.progress?.scores ?? {},
    },
  };
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalise);
}

export async function saveProgress(courseId: string, progress: CourseProgress) {
  const { error } = await supabase
    .from("courses")
    .update({ progress: progress as unknown as never })
    .eq("id", courseId);
  if (error) throw error;
}

export function courseCompletion(course: Course): number {
  if (course.lessons.length === 0) return 0;
  return Math.round((course.progress.completed.length / course.lessons.length) * 100);
}
