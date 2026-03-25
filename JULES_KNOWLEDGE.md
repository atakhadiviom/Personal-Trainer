# AI Agent (Jules) Knowledge Base for NovaFit

## 📖 Overview
NovaFit is a production-ready AI fitness platform that generates hyper-personalized 12-week workout and nutrition plans.
**Tech Stack:** React 19, Vite, Firebase (Auth, Firestore, Cloud Functions, Messaging), Gemini AI.

## 🎯 Core Objectives for Jules
Your mission as the AI developer (Jules) is to autonomously improve the app based on the following strict goals:
1. **Remove Photo-Upload Dependencies:** Do NOT introduce features requiring user photo uploads. Ensure any legacy photo-nudge cloud functions (e.g., `weeklyPhotoNudge` in `functions/index.js`) are safely refactored or removed.
2. **Streamline Onboarding Wizard:** Make the `src/components/Wizard/` steps frictionless. Ensure form validation is highly robust but user-friendly.
3. **Robust Firebase Integration:** Ensure Firestore database rules, reads/writes, and Cloud Functions run error-free. Handle AI generation quotas and offline states gracefully in the UI.
4. **Optimize AI Workout Generation:** The core feature is `generatePlan`. Maintain exact JSON structures. We use `gemini-2.5-flash-lite` on the frontend and `gemini-2.0-flash` on the backend.
5. **No Complex Billing:** Deliver core value without complex Stripe or billing overhead.
6. **PWA Compliance:** Maintain and enhance Progressive Web App capabilities for a native-like mobile experience.

## 🏗️ Architecture & Key Files
- `src/App.jsx`: Main entry, handles Auth state, routing ('wizard' vs 'dashboard'), and frontend Gemini execution.
- `src/components/Wizard/`: Contains all onboarding components (`StepBody`, `StepProblems`, `StepGym`, `LoadingAI`).
- `functions/index.js`: Backend Firebase Functions. Contains `generateNovaFitPlan` and scheduled CRON jobs.
- `firebase.json` & `firestore.rules`: Security, hosting, and database configurations.

## 🛠️ Coding Standards
- **Branching Rule:** ALWAYS perform edits on the `staging` branch (Strict User Rule).
- **Styling:** Use Vanilla CSS (`src/index.css`) with modern UI patterns (glassmorphism, vibrant gradients). Do not introduce Tailwind unless explicitly requested.
- **State:** Use React Hooks (`useState`, `useEffect`). Avoid heavy state management libraries like Redux.
- **Code Quality:** Ensure ESLint passes before any major commit.
