# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NovaFit AI: React 19 + Vite PWA that generates 12-week workout/nutrition plans. Firebase (Auth, Firestore, Hosting, scheduled Cloud Functions) backs it; AI is DeepSeek behind a Cloudflare Worker. `JULES_KNOWLEDGE.md` is stale (still mentions Gemini) — trust the code and README.

## Commands

```bash
npm install --legacy-peer-deps   # flag required (CI uses it too)
npm run dev                      # Vite, http://localhost:5173
npm run build                    # -> dist/
npm run lint                     # ESLint (flat config)
npm test                         # vitest run (jsdom, globals, src/setupTests.js)
npx vitest run src/__tests__/aiService.test.js   # single test file
npx vitest run -t "name"                         # single test by name
```

Worker (`worker/`): `npx wrangler deploy`, `npx wrangler secret put DEEPSEEK_API_KEY`. Worker has its own `worker/worker.test.js`.

Env vars: copy `.env.example` to `.env`; also needs `VITE_AI_PROXY_URL` for AI (set in the deploy workflow, not in `.env.example`).

## Architecture

- **AI path**: UI -> `src/utils/aiService.js` (builds the plan prompt) -> `src/utils/aiModel.js` -> `POST VITE_AI_PROXY_URL` with Firebase ID token as `Bearer` -> `worker/src/index.js` verifies the token against Google JWKS (project `novafit-ai-5be0c`), checks `ALLOWED_ORIGINS` CORS, calls DeepSeek with the secret key. `getAIModel()` mimics the old `generateContent(...).response.text()` shape so call sites did not change; it retries once if the reply is not parseable JSON. Prompts demand exact JSON; callers slice from first `{` to last `}` before `JSON.parse`. Free-text user input is fenced in prompts as "data not instructions" — keep that.
- **No offline fallback**: if the AI call fails, `App.jsx` shows the error and returns to the wizard. Plans are never generated locally.
- **App flow**: `App.jsx` owns auth state and routes between Login, Onboarding intro, Wizard (`components/Wizard/`: StepBody, StepProblems, StepGym, LoadingAI, ResultPlan) and Dashboard tabs (`components/Dashboard/`: MyPlan, CalorieTracker(Page), HealthPage, ProfilePage), lazy-loaded with Suspense.
- **Google Fit**: `src/utils/googleFitService.js` does OAuth + REST fetches client-side using `VITE_GOOGLE_CLIENT_ID`.
- **Functions**: `functions/index.js` (Node 20, separate `package.json`) holds scheduled jobs such as `dailyWorkoutNudge` (FCM, batched 500 users). Photo-upload features are out of scope per `JULES_KNOWLEDGE.md`.
- **Build**: `vite.config.js` uses `vite-plugin-pwa` (autoUpdate, skipWaiting) and splits `firebase` and `recharts` chunks. Hosting rewrites all paths to `index.html`.

## Workflow rules

- Work on the `staging` branch. Pushing to `staging` triggers `.github/workflows/firebase-deploy.yml` (build + deploy to live Firebase Hosting, project `novafit-ai-5be0c`). Treat every push as a production deploy.
- Styling is vanilla CSS in `src/index.css`; no Tailwind, no Redux.
- ESLint `no-unused-vars` ignores names starting with a capital letter or `_`.
- Tests live in `src/__tests__/` (plus a few colocated `__tests__`/`*.test.js`); AI is mocked in tests.
