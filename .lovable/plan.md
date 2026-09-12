# DreamForge Builder, Studio Modules, and VISION

## Goal
Complete the existing DreamForge experience without redesigning or removing current content: add the working project lifecycle, creative exports, research tools, token visibility, and the cinematic VISION overlay.

## Build

1. **Shared signed-in studio shell**
   - Use the existing bold editorial navigation and authentication pattern across Mentor, Builder, Project Studio, Research, Tokens, and My Projects.
   - Add My Projects to the existing studio navigation and keep token balance visible before any generation action.

2. **Module 1: real project builder**
   - Add a Builder page using the same mentor-chat visual language.
   - Send the dream to the existing real AI generation endpoint, validate the returned runnable files, preview the generated `index.html`, show sprint and code tabs, calculate token cost, and save the result.
   - Post a concise project summary into mentor history so follow-up chat can use the generated project as context.

3. **My Projects**
   - List every saved project with title, dream, stack, creation date, token cost, report status, creative assets, and scan status.
   - Provide expandable code files, a safe working-page preview, report/PPT/poster downloads, and a direct link into Project Studio for rescanning.

4. **Project Studio and error scanning**
   - Support code paste and local file upload, AI scans, severity-grouped findings, suggested fixes, saved scan history, and mentor-chat context.
   - Allow a generated project to be opened directly and scan its files after creation.

5. **Module 4: research and reports**
   - Add paper finder, literature review, and project report modes using the existing AI endpoint.
   - Save outputs, show readable markdown, and pass generated research/report context into the mentor chat.

6. **PPT and poster generator**
   - Add project-aware generation from the mentor/studio flow.
   - Produce editable PPTX, poster PNG, and print-ready poster PDF in DreamForge’s cream, charcoal, vermilion, and yellow editorial style.
   - Save asset references to the project and expose downloads from My Projects.

7. **Token screen and charging**
   - Show current balance, action costs, and transaction history.
   - Charge through the existing atomic token function before paid generation, record the exact cost on each project/artifact/scan, and block clearly when funds are insufficient.

8. **Generate the requested real project**
   - Generate the AI-powered Smart Study Assistant with study plans, summaries, quizzes, flashcards, progress tracking, and step-by-step mentor support.
   - Save it to the signed-in user’s My Projects, generate its report, PPTX, poster PNG/PDF, calculate costs, and run a code scan.

9. **Cinematic VISION overlay**
   - Replace only the hero’s existing “Try the mentor” secondary action with “VISION”.
   - Open a full-screen, accessible HTML5 video overlay using the supplied Cloudinary URL directly with autoplay, muted, playsInline, hidden controls, cover sizing, no loop, and natural playback speed.
   - Add minimal EXIT/× controls, Escape-key close, focus handling, fade-in/fade-out, playback completion reveal (“YOUR VISION. BROUGHT TO LIFE. DREAMFORGE AI”), and a graceful load-error fallback.
   - Leave the navbar, hero copy, audience sections, modules, pricing, footer, and all other landing functionality unchanged.

## Technical details
- Extend the existing private user tables to associate project reports, creative exports, scans, and token costs while preserving row-level ownership rules and grants.
- Keep Lovable AI calls server-side, streaming Responses API calls, validate inputs/outputs, and surface gateway errors verbatim where actionable.
- Use installed AI Elements for the rebuilt chat surface rather than custom chat primitives, while preserving the existing bold editorial styling.
- Use browser-safe sandboxed previews for generated HTML and object URLs for generated downloads.
- Verify AI endpoints with real calls, all authenticated workflows in the preview, desktop and mobile layouts, video success/error/finish states, and every page/slide of generated visual files.

## Acceptance checks
- Existing landing content remains intact except the requested secondary hero action label/behavior.
- A signed-in user can see balance, generate and reopen a real project, view code/report/cost, download all creative formats, run a scan, and continue discussing every artifact with the mentor.
- The Smart Study Assistant appears in My Projects with generated outputs and scan results.
- VISION works reliably on desktop and mobile and never loops, stretches, or embeds added text in the video.
