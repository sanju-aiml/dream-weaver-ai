ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deck jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.talent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  looking_for text NOT NULL DEFAULT 'internship',
  college text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_profiles TO authenticated;
GRANT ALL ON public.talent_profiles TO service_role;
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can browse talent"
  ON public.talent_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert their own talent profile"
  ON public.talent_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own talent profile"
  ON public.talent_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own talent profile"
  ON public.talent_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.founder_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.founder_interests TO authenticated;
GRANT ALL ON public.founder_interests TO service_role;
ALTER TABLE public.founder_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Both sides read their intros"
  ON public.founder_interests FOR SELECT TO authenticated
  USING (auth.uid() = founder_id OR auth.uid() = student_id);
CREATE POLICY "Founders create intros"
  ON public.founder_interests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "Founders withdraw intros"
  ON public.founder_interests FOR DELETE TO authenticated
  USING (auth.uid() = founder_id);

DROP POLICY IF EXISTS "Signed-in users can see shared projects" ON public.projects;
CREATE POLICY "Signed-in users can see shared projects"
  ON public.projects FOR SELECT TO authenticated USING (shared = true);