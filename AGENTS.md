# AGENTS.md — /Users/atakhadivi/Personal-Trainer

NovaFit AI: 12-week gym trainer web app with DeepSeek AI workout/nutrition generation, Firebase Auth + Firestore, and analytics.

## Commands
- `npm run dev`: local dev server (port 5173).
- `npm test`: run Vitest suite.
- `npm run lint`: ESLint check.
- `npm run build`: Vite production build.

## Architecture
- **Frontend**: React 19 + Vite + PWA (`vite-plugin-pwa`). Recharts for visual progress.
- **Backend / Auth**: Firebase Auth + Firestore (client SDK v12).
- **AI Proxy**: Cloudflare Worker at `https://ai.atakhadivi.com` calling DeepSeek API with Firebase JWT verification.
- **Hosting**: Firebase Hosting at `https://novafit-ai-5be0c.web.app`.

## Deployment & Git Rules
- `origin/staging` triggers automated live Firebase deployment. **Never push to `staging` without explicit user approval.**
- Always create feature branches for improvements (`git checkout -b feat/...`).
- Run `npm test`, `npm run lint`, and `npm run build` before committing.
- Commit messages: concise, conventional style.

## Improvement Backlog
1. **Per-Set Workout Logging**: Log weight, reps, and RPE per set with interactive volume chart (Recharts) and rest timer.
2. **Toast Notifications**: Replace blocking browser `alert()`/`confirm()` with inline toast system.
3. **Component Refactor**: Modularize `MyPlan.jsx` (~760 lines) into focused sub-components.
4. **Offline Resilience**: Cache workout plans locally so users can track sets in gym basements without network.
5. **UI & Accessibility**: Add missing ARIA labels, improve contrast for dark/light modes, keyboard navigable workouts.
6. **Lint & Dep Updates**: Clean up remaining ESLint warnings; keep dependencies secure.
