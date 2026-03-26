import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "fake-auth-domain",
  projectId: "fake-project-id",
  storageBucket: "fake-bucket",
  messagingSenderId: "123456",
  appId: "fake-app-id",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});

const provider = new GoogleAuthProvider();
try {
  await signInWithPopup(auth, provider);
} catch (e) {
  console.log("Error caught:", e);
}
