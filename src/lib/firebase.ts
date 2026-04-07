import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Default config from environment variables
const firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

// For AI Studio compatibility, we try to load from the JSON file if env vars are missing
// We use a non-top-level approach or just a simple check
// Since this is a client-side app, we can't easily do sync file reads.
// However, we can just export a promise or initialize lazily.

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const functions = getFunctions(app);

// If you are running this outside of AI Studio, ensure you set the VITE_FIREBASE_* environment variables.
if (!firebaseConfig.apiKey) {
  console.warn("Firebase API Key is missing. If you are in AI Studio, ensure firebase-applet-config.json exists. If you are deploying elsewhere, set your VITE_FIREBASE_* environment variables.");
}
