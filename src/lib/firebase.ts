import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDQp3Szv4UHYo-YZc6aNMalLw95zd1zkhc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taskflowtaqat.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "taskflowtaqat",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taskflowtaqat.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "309909703766",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:309909703766:web:ff5acb9c3cc26ffe66fff7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9X19MQBE1D"
};

// Initialize Firebase safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
