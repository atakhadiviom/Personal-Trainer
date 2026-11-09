# AGENTS.md — NovaFit AI

NovaFit AI: 12-week gym trainer web app with DeepSeek AI workout/nutrition generation, Firebase Auth + Firestore, and analytics.

## Commands
- `npm run dev`: local dev server (port 5173).
- `npm test`: run Vitest suite.
- `npm run lint`: ESLint check (0 errors, 0 warnings).
- `npm run build`: Vite production build.

## Architecture
- **Frontend**: React 19 + Vite + PWA (`vite-plugin-pwa`). Recharts for visual progress.
- **Backend / Auth**: Firebase Auth + Firestore (client SDK v12).
- **AI Proxy**: Cloudflare Worker at `https://ai.novafitai.tech` calling DeepSeek API with Firebase JWT verification.
- **Hosting**: Firebase Hosting at `https://novafit-ai-5be0c.web.app` (custom domain `novafitai.tech`).

## Deployment & Git Rules
- `origin/staging` triggers automated live Firebase deployment.
- Autonomous improvements push directly to `staging` after 100% test pass and clean lint.
- Commit messages: concise, conventional style.

## Startup Roadmap & Daily Schedule
1. [x] **Toast Notifications**: Replaced blocking browser `alert()` with inline accessible Toast alerts.
2. [x] **In-Gym Interactive Rest Timer**: Countdown timer with +30s/-15s, pause/resume, audio beep, haptics, and rest chips.
3. [x] **Offline Resilience**: Instant local state hydration and caching via `localStorage` for gym basements.
4. [x] **Viral Transformation Cards**: 1-click social share cards with WhatsApp and native share integration.
5. [x] **Multi-Modal Meal Logging**: Browser-native voice dictation button (`🎙️`) + quick meal staple chips.
6. [x] **NovaFit Pro Tier ($9.99/mo)**: Upgrade flow and gating for advanced biometric readiness and unlimited plan adaptations.
7. [x] **AI Coach Voice Check-in**: Spoken feedback and weekly debrief from Coach Leo using browser speech synthesis.
8. [x] **Workout Streaks & Recovery Advice**: Consistency streak (2 rest days allowed), 7-day strip, milestones, and rest-day recovery tips driven by sleep and training load.
9. [x] **Bundle Optimization**: Code-split Recharts and Firebase chunks below 500kB.
10. [x] **Personal Records & Progressive Overload**: Inline set logging (kg × reps), estimated 1RM PR badges, 7-day tonnage, and next-session load targets (increase/hold/reduce/deload).
11. [x] **Workout History & Analytics**: 8-week tonnage trend, Monday-start training calendar heatmap, recent session cards, per-exercise breakdown with 14-day volume trend, and CSV export.
12. [x] **Load & Recovery Advisor**: acute:chronic workload ratio (7-day vs 4-week average), zone gauge, week-over-week ramp, monotony, and deload/caution/rest coaching derived from the set log — no new storage.
13. [x] **Guided Workout Session Player**: full-screen set-by-set mode from any training day — coach-prefilled load/reps, set dots, rest countdown with +30s/skip, undo and skip exercise, live PR detection, session summary, and 12-hour resume after an interruption.
14. [x] **Body Progress & Photo Timeline**: weight/waist/chest/arm/hips/thigh check-ins with per-metric trends, same-day merge, goal-aware coaching insight, private on-device photo gallery with before/after compare slider, and a month-grouped timeline.
15. [x] **Weekly Adherence Scorecard**: one 7-day execution score joining training days (60%), meal logging/calorie accuracy/protein (40%) and the body-weight trend, with grade, highlight chips and a single next-week focus action.

## OpenBot Automated Schedule
- Scheduled Routine: `NovaFit Autonomous Startup Lead` runs daily at 09:00 (Asia/Muscat).
