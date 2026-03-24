import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyCj2aTfIS8nfEtSM2AY3OF0B2tVCvZjJh8",
  authDomain: "novafit-ai-5be0c.firebaseapp.com",
  projectId: "novafit-ai-5be0c",
  storageBucket: "novafit-ai-5be0c.firebasestorage.app",
  messagingSenderId: "512328032494",
  appId: "1:512328032494:web:6f9d60d76b8ad3b4ebd3ff",
  measurementId: "G-LC4BNZ69SK"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const auth = getAuth(app);

// Modern Firestore init with built-in offline persistence (replaces deprecated enableIndexedDbPersistence)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);
export const aiInstance = getAI(app);
