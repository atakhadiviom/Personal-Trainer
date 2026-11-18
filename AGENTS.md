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
16. [x] **Auto-Regulated Deload Week**: compares each lift's best estimated 1RM across the two latest completed weeks, recommends a deload when half or more are flat or the acute:chronic ratio is overreaching, previews rewritten loads and one fewer set per lift, applies the change to the saved week plan, and can be undone.
17. [x] **Intra-Session Autoregulation**: optional RPE (6–10) on each logged set plus a next-set engine that adds, holds or drops plates from reps hit and reps in reserve, previews the adjusted load and rep target in the guided player, and survives a session restore.
18. [x] **Gym Load Steps**: one Profile setting for the smallest jump in the athlete's gym (1.25 kg fractional plates, 2 kg dumbbells, 2.5 kg standard bar, 5 kg machine stack) that rounds every next-set, next-session and deload target to a buildable weight — applied live inside an open session.
19. [x] **Warm-Up Ramp**: every exercise's first work set is preceded by a coached ramp (50 % × 5, 70 % × 3, 85 % × 2) derived from the weight in the box, rounded down to the athlete's own jump, tickable set by set, persisted with the active session, and skippable in one tap.
20. [x] **Plate Math**: the guided session turns the load in the kg box into the exact plates per side on the athlete's own bar (20/15/10/7 kg or plate-loaded with no bar), flags weights that are not buildable and offers the two nearest buildable loads, and hides entirely on cable, dumbbell, machine and bodyweight work.
21. [x] **Per-Exercise Warm-Up Volume**: a warm-up switch in the guided session offers a full three-rung ramp, a single heavy double at 85 % for isolation work and short sessions, or off — applied live to the rungs, remembered per exercise on the device, and restorable in one tap after a skip.
22. [x] **Busy-Rack Substitution**: the guided session matches the current lift to its movement pattern and offers up to three same-pattern alternatives on different kit (dumbbell, cable, machine, bodyweight, band), keeping sets, reps and rest, estimating a starting load from the plan weight and the athlete's gym jump, rebuilding the warm-up ramp for it, and restoring the original lift in one tap — unavailable once a set is logged, and kept across a session restore.

## OpenBot Automated Schedule
- Scheduled Routine: `NovaFit Autonomous Startup Lead` runs daily at 09:00 (Asia/Muscat).
