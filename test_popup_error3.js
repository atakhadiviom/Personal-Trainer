import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDummyKey123",
  authDomain: "dummy.firebaseapp.com",
  projectId: "dummy-project",
  storageBucket: "dummy-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456",
  measurementId: "G-ABCDEF123"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
});

const provider = new GoogleAuthProvider();

try {
  console.log("Attempting sign in...");
  signInWithPopup(auth, provider).then(() => {
    console.log("Sign in returned (unexpectedly).");
    process.exit(0);
  }).catch(e => {
    console.log("Catch block error:", e.message);
    process.exit(0);
  });
} catch (e) {
  console.log("Try-catch error:", e.message);
}
