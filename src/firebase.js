import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI } from "firebase/ai";

const requiredFirebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

export const firebaseMissingEnvKeys = requiredFirebaseEnvKeys.filter(
  (key) => !import.meta.env[key]?.trim()
);

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseConfigured = firebaseMissingEnvKeys.length === 0;

export const firebaseSetupError = isFirebaseConfigured
  ? null
  : `Firebase is not configured. Missing environment variables: ${firebaseMissingEnvKeys.join(", ")}`;

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const analytics =
  typeof window !== "undefined" && app ? getAnalytics(app) : null;

// Use browserLocalPersistence to avoid sessionStorage failures in
// storage-partitioned WebViews (Telegram, Instagram, etc.)
export const auth = app
  ? initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    })
  : null;

// Modern Firestore init with built-in offline persistence (replaces deprecated enableIndexedDbPersistence)
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  : null;

export const storage = app ? getStorage(app) : null;
export const aiInstance = app ? getAI(app) : null;
