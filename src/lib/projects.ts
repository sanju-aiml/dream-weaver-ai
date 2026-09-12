import { supabase } from "@/integrations/supabase/client";
import type { Deck } from "./assets.functions";

export type ProjectFile = { path: string; language: string; code: string };

export type ProjectSprint = { name: string; goal: string; tasks: string[] };

export type ProjectAsset = { kind: string; name: string; url?: string };

export type Project = {
  id: string;
  user_id: string;
  title: string;
  dream: string;
  summary: string | null;
  stack: string[];
  sprints: ProjectSprint[];
  files: ProjectFile[];
  cost: number;
  report_content: string | null;
  assets: ProjectAsset[];
  deck: Deck | Record<string, never> | null;
  shared: boolean;
  demo_url: string | null;
  created_at: string;
};

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

/** Projects their owners chose to publish to the founder gallery. */
export async function listSharedProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("shared", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) return null;
  return data as unknown as Project;
}

export async function setProjectShared(id: string, shared: boolean) {
  const { error } = await supabase.from("projects").update({ shared }).eq("id", id);
  if (error) throw error;
}

export async function createProject(values: {
  title: string;
  dream: string;
  summary: string;
  stack: string[];
  sprints: ProjectSprint[];
  files: ProjectFile[];
  cost: number;
  report_content?: string;
}): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: values.title,
      dream: values.dream,
      summary: values.summary,
      stack: values.stack,
      sprints: values.sprints as unknown as object,
      files: values.files as unknown as object,
      cost: values.cost,
      report_content: values.report_content ?? "",
    } as never)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Could not save project");
  return data as unknown as Project;
}

export function makeDemoBlobUrl(files: ProjectFile[]): string | null {
  const indexHtml = files.find((f) => f.path === "index.html")?.code;
  if (!indexHtml) return null;
  const blob = new Blob([indexHtml], { type: "text/html" });
  return URL.createObjectURL(blob);
}

/** Compact description of a project so the mentor and the tools share context. */
export function projectBrief(project: Project): string {
  return [
    `Project: ${project.title}`,
    `Dream: ${project.dream}`,
    project.summary ? `Summary: ${project.summary}` : "",
    project.stack.length ? `Stack: ${project.stack.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
