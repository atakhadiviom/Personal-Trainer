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
7. [ ] **AI Coach Voice Check-in**: Spoken feedback from coach on weekly progress submit.
8. [ ] **Bundle Optimization**: Code-split Recharts and Firebase chunks below 500kB.

## OpenBot Automated Schedule
- Scheduled Routine: `NovaFit Autonomous Startup Lead` runs daily at 09:00 (Asia/Muscat).
