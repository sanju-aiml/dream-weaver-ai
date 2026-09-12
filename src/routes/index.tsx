import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bug,
  GraduationCap,
  Hammer,
  Image as ImageIcon,
  MessagesSquare,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { MentorChat } from "@/components/MentorChat";
import { VisionBackground } from "@/components/VisionBackground";
import mark from "@/assets/dreamforge-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DreamForge AI — type a dream, get a real project" },
      {
        name: "description",
        content:
          "One AI agent that turns a dream into a working project: live mentoring, error fixing, academic support, creative assets and career connections.",
      },
      { property: "og:title", content: "DreamForge AI — type a dream, get a real project" },
      {
        property: "og:description",
        content:
          "Build, learn, fix and get hired — one talkative AI mentor for students, founders and clients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const audiences = [
  {
    tag: "Students",
    title: "Dream projects, done properly",
    body: "Working code, hardware lists, report, PPT, poster, viva prep and papers — plus a mentor that never sleeps.",
  },
  {
    tag: "Founders",
    title: "Prototype and scout talent",
    body: "Ship a demo this week, then browse live student demos and hire the people who actually built things.",
  },
  {
    tag: "Clients",
    title: "No freelancer needed",
    body: "Describe the site or tool you need in plain language. Get an MVP first, then iterate until it is right.",
  },
];

const modules = [
  { icon: Hammer, name: "Project Builder", copy: "Prompt enhancer, Agile sprints, code, hardware and live demo." },
  { icon: MessagesSquare, name: "AI Mentor", copy: "Line-by-line walkthroughs, debugging, interview and viva prep." },
  { icon: Bug, name: "Fix My Project", copy: "Upload a broken repo — get errors explained, fixed and re-tested." },
  { icon: GraduationCap, name: "Academic Support", copy: "Papers, summaries, citations, reports and CGPA maths." },
  { icon: ImageIcon, name: "Creative Assets", copy: "Slides, posters, banners, logos and speaker notes on demand." },
  { icon: Sparkles, name: "Skill Courses", copy: "Learn by building, with quizzes, progress and certificates." },
  { icon: Rocket, name: "Career Connect", copy: "Portfolio, resume and demos sent straight to founders." },
  { icon: Users, name: "Community", copy: "Share ideas, get peer feedback and daily tech news." },
];

const plans = [
  { name: "Free", price: "₹0", line: "1 simple project on open models", perks: ["Mentor chat", "Saved history"] },
  {
    name: "Starter",
    price: "₹99",
    line: "5 tokens — 5 projects with reports",
    perks: ["Better model", "Project report", "Assets"],
    featured: true,
  },
  {
    name: "Pro",
    price: "₹299",
    line: "20 tokens, priority and startup matching",
    perks: ["Priority queue", "Founder matching", "All modules"],
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b-2 border-border px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2">
          <img src={mark} alt="DreamForge AI" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-sm sm:text-base">DreamForge AI</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#modules" className="hidden underline-offset-4 hover:underline sm:inline">
            Modules
          </a>
          <a href="#pricing" className="hidden underline-offset-4 hover:underline sm:inline">
            Pricing
          </a>
          <Link
            to="/auth"
            className="brut-sm bg-accent px-3 py-2 font-display text-xs text-accent-foreground uppercase"
          >
            Start free
          </Link>
        </nav>
      </header>

      <VisionBackground>
      <section className="grid gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-28">
        <div className="text-white">
          <p className="font-display text-xs tracking-[0.3em] text-highlight uppercase">
            Dream in. Project out.
          </p>
          <h1 className="mt-5 text-5xl leading-[0.92] sm:text-7xl">
            Type a dream.
            <br />
            <span className="marker">Walk out</span>
            <br />
            with a project.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/75">
            One talkative AI agent that plans, builds, tests, teaches, fixes your broken code,
            writes the report, designs the poster — and then introduces you to founders who are
            hiring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="brut bg-accent px-6 py-4 font-display text-sm text-accent-foreground uppercase transition-transform hover:-translate-y-1"
            >
              Forge my project
            </Link>
            <a
              href="#demo"
              className="brut bg-card px-6 py-4 font-display text-sm text-foreground uppercase transition-transform hover:-translate-y-1"
            >
              Try the mentor
            </a>
          </div>
          <p className="mt-6 text-xs text-white/50">Scroll to travel from orbit to the forest floor.</p>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t-2 border-white/25 pt-6">
            {[
              ["Agile", "MVP first, then sprints"],
              ["24/7", "Mentor never sleeps"],
              ["End to end", "Code to career"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-display text-lg">{k}</dt>
                <dd className="text-xs text-white/60">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div id="demo" className="brut flex h-[560px] flex-col overflow-hidden bg-card">
          <div className="flex items-center justify-between border-b-2 border-border bg-primary px-4 py-2 text-primary-foreground">
            <span className="font-display text-xs tracking-widest uppercase">Live mentor</span>
            <span className="text-xs opacity-70">Free to try</span>
          </div>
          <MentorChat
            className="min-h-0"
            suggestions={[
              "I want a robot that follows me and avoids obstacles",
              "A booking website for a small clinic",
              "Explain recursion like I'm 12",
            ]}
            emptyState={
              <div className="space-y-2">
                <h2 className="text-xl">What do you want to build?</h2>
                <p className="text-sm text-muted-foreground">
                  Say it however it sounds in your head. I'll sharpen it into a real plan and start
                  sprint one with you.
                </p>
              </div>
            }
          />
        </div>
      </section>
      </VisionBackground>

      <section className="border-y-2 border-border bg-primary px-4 py-14 text-primary-foreground sm:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.tag}>
              <p className="font-display text-xs tracking-[0.3em] uppercase opacity-70">{a.tag}</p>
              <h2 className="mt-3 text-2xl">{a.title}</h2>
              <p className="mt-3 text-sm opacity-80">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="px-4 py-16 sm:px-8">
        <h2 className="text-4xl sm:text-5xl">Eleven modules. One agent.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Everything a project needs, from the first idea to the internship offer.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <article
              key={m.name}
              className="brut-sm bg-card p-5 transition-transform hover:-translate-y-1"
            >
              <m.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 text-base">{m.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{m.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-border px-4 py-16 sm:px-8">
        <h2 className="text-4xl sm:text-5xl">Priya's four weeks</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            ["Week 1", "Dream sharpened, parts list, first movement code — every line explained."],
            ["Week 2", "Human-following added, live debugging, three research papers found."],
            ["Week 3", "Final tests, 20-page report, PPT from her college template, poster."],
            ["Week 4", "Live demo shared with five founders. One internship offer."],
          ].map(([week, text]) => (
            <li key={week} className="rule-top pt-4">
              <p className="font-display text-sm text-accent">{week}</p>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="border-t-2 border-border px-4 py-16 sm:px-8">
        <h2 className="text-4xl sm:text-5xl">Pay per dream</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Tokens, not subscriptions you forget about. Bring your own model key any time.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`brut p-6 ${p.featured ? "bg-highlight text-highlight-foreground" : "bg-card"}`}
            >
              <p className="font-display text-xs tracking-[0.3em] uppercase">{p.name}</p>
              <p className="mt-3 font-display text-5xl">{p.price}</p>
              <p className="mt-2 text-sm">{p.line}</p>
              <ul className="mt-5 space-y-1 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk}>— {perk}</li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="brut-sm mt-6 inline-block bg-primary px-4 py-2 font-display text-xs text-primary-foreground uppercase"
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-border px-4 py-10 text-sm sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-display">DreamForge AI</p>
          <p className="text-muted-foreground">Build. Learn. Fix. Get hired.</p>
          <Link to="/auth" className="underline underline-offset-4">
            Create your account
          </Link>
        </div>
      </footer>

      <VisionOverlay open={visionOpen} onClose={() => setVisionOpen(false)} />
    </div>
  );
}
