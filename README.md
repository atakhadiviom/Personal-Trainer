# NovaFit AI

NovaFit AI is a personalized fitness web app that generates 12-week workout and nutrition plans using Google Gemini. Users complete a short onboarding wizard, and the AI builds a plan tailored to their body, goals, injuries, diet, and gym schedule.

## Features

- **AI workout plans** — 12-week programs with phased progression, warm-ups, exercises (sets/reps/weight cues), and cool-downs
- **Nutrition guidance** — Macro targets and meal suggestions aligned with diet preferences and goals
- **Onboarding wizard** — Three steps: body stats & goals, health/injuries, gym & schedule
- **My Plan dashboard** — Weekly workout view, exercise completion tracking, weekly check-ins, and AI plan adjustments
- **Calorie tracker** — Chat-style meal logging; Gemini estimates calories and macros from natural language
- **Google Fit integration** — Steps, calories burned, heart rate, and sleep synced into the Health tab
- **Firebase auth** — Email/password and Google sign-in
- **PWA** — Installable on mobile with offline-friendly caching via Workbox

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Vanilla CSS |
| Backend | Firebase (Auth, Firestore, Cloud Functions, AI Logic) |
| AI | Google Gemini (`gemini-3-flash-preview` client-side, `gemini-2.0-flash` in Cloud Functions) |
| Charts | Recharts |
| Health data | Google Fit REST API |
| Deploy | Firebase Hosting (CI via GitHub Actions on `staging`) |

## Getting Started

### Prerequisites

- Node.js 24+
- A Firebase project with Auth, Firestore, and AI Logic enabled
- A Google OAuth client ID (for Google sign-in and Google Fit)

### Setup

1. Clone the repo and install dependencies:

```bash
npm install --legacy-peer-deps
```

2. Copy the environment template and fill in your Firebase values:

```bash
cp .env.example .env
```

3. Start the dev server:

```bash
npm run dev
```

4. Open the URL shown in the terminal (typically `http://localhost:5173`).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID (optional) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for sign-in and Google Fit |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest test suite |

## Project Structure

```
src/
├── App.jsx                 # Auth, wizard vs dashboard routing, plan generation
├── firebase.js             # Firebase initialization
├── components/
│   ├── Auth/               # Login / register
│   ├── Onboarding/         # First-launch intro slides
│   ├── Wizard/             # 3-step plan setup wizard
│   ├── Dashboard/          # My Plan, Calories, Health, Profile tabs
│   └── Layout/             # Navbar, ErrorBoundary
└── utils/
    ├── aiService.js        # Client-side Gemini plan generation
    └── googleFitService.js # Google Fit OAuth & data fetching
functions/
└── index.js                # Cloud Functions (generateNovaFitPlan, scheduled jobs)
```

## Deployment

Pushes to the `staging` branch trigger a GitHub Actions workflow that builds the app and deploys to Firebase Hosting (`novafit-ai-5be0c`). Required secrets are listed in `.github/workflows/firebase-deploy.yml`.

Manual deploy:

```bash
npm run build
firebase deploy --only hosting
```

## Testing

```bash
npm test
```

Tests cover auth, calorie tracking, health features, Google Fit service, AI mocks, and dashboard components.

## License

Private — not for redistribution.
