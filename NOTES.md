# Adaptive Learning Layer — Implementation Notes

## What was built

Added a **Student Knowledge State system** that makes the tutor adaptive and personalized:

- **Topic mastery tracking**: After every graded quiz/test, `.data/student-profile.json` is updated with per-topic correctRate and attempt counts. Mastery is computed as `unknown → learning → familiar → mastered` based on attempt count and correct rate.
- **Three new agent CLI commands**: `student profile`, `student weak-topics`, `student record <attemptId>` — the agent can inspect the student's state before generating content.
- **New skill `adapt-to-student`**: Instructs Gemini to call `student profile` before creating a quiz, weight 60%+ of questions toward weak topics, and label every question with a `topicId`. After grading, it runs `student record` to close the feedback loop.
- **Two new HTTP endpoints**: `GET /api/student/profile` and `GET /api/student/weak-topics` — consumed by the frontend.
- **Progress Panel**: Added to the sidebar showing per-topic mastery with color-coded progress bars (green=mastered, blue=familiar, amber=learning, gray=unknown), sorted with weakest topics first.
- **Topic breakdown**: After quiz submission, the result screen shows per-topic score with encouragement or review advice — visible when the agent has labeled questions with `topicId`.

## How to test manually

1. Install deps: `pnpm install`
2. Copy `.env.example` to `.env` and add your Gemini API key
3. Start server: `pnpm --filter @proxus/server run dev`
4. Start web: `pnpm --filter @proxus/web run dev`
5. Place a PDF in `packages/server/.data/materials/pdfs/`
6. In the chat: *"Create an adaptive quiz on [topic] from [material]"* — the tutor will call `student profile` first, then `adapt-to-student` guides question generation with `topicId` labels
7. Solve the quiz and submit — the result screen shows a topic breakdown
8. Check `.data/student-profile.json` — it should be created/updated
9. Ask for another quiz — the tutor should acknowledge weak topics and weight questions accordingly
10. The sidebar Progress Panel shows mastery bars updating in real time

## Known limitation

The `topicId` field on questions is optional. Existing quizzes created before this change have no `topicId` — the student record command falls back to using the artifact ID as the topic, so the profile still updates but topic labels are less meaningful until the agent starts labeling new quizzes.

## What I would do next

- Surface attempt history per topic so students can see how they improved over time
- Add AI-powered short-answer grading (currently string match) — a Gemini call that returns `{ score, feedback }` would make assessments much more accurate
- Add PDF upload endpoint and UI — currently PDFs must be manually placed in the filesystem
- Add per-session context so the tutor remembers what was discussed across page refreshes

## Update: Full Learning Loop (added after initial submission)

### What was added
- Mistake capture: wrong answers (question, student answer, correct answer) now stored
  per topic in student-profile.json after every graded attempt
- `student mistakes [topicId]` CLI command exposes mistake history to the agent
- `generate-revision-plan` skill: agent reads mistakes, finds relevant material pages,
  creates a targeted note artifact explaining weak concepts with worked examples
- `focused-quiz` skill: agent creates quizzes weighted 100% toward weak topics,
  phrasing questions differently from previous wrong attempts
- MistakeHistory component in sidebar showing per-topic wrong answers
- Two action buttons in ProgressPanel: "Get Revision Plan" and "Focused Quiz"

### The complete learning loop now works as
Upload PDF → Generate quiz → Take quiz → Mistakes captured automatically →
"Get Revision Plan" → Targeted note created → "Focused Quiz" → Profile updated → repeat

### Trade-off made
Mistake analysis is structural (wrong answer stored) not semantic (why it was wrong).
Gemini interprets the mistake pattern when generating the revision plan — this means
quality depends on prompt following. A more robust approach would run a dedicated
Gemini call immediately after grading to classify each mistake by concept type.
