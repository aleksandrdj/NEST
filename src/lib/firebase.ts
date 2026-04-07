import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Try to load AI Studio config if it exists (optional)
const configs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const aiStudioConfig: any = configs['../../firebase-applet-config.json'] || {};
const aiData = aiStudioConfig.default || aiStudioConfig;

// Default config from environment variables with fallback to AI Studio config
const firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || aiData.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || aiData.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || aiData.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || aiData.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || aiData.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || aiData.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || aiData.firestoreDatabaseId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const functions = getFunctions(app);

// Validation
if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing. Please set environment variables or ensure firebase-applet-config.json exists.");
}
