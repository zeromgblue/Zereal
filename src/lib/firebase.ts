import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.projectId);

function init(): { auth: Auth; db: Firestore } | null {
  if (!firebaseReady || typeof window === "undefined") return null;
  const existing = getApps()[0];
  const app = existing ?? initializeApp(config);
  let db: Firestore;
  try {
    // Persistent cache keeps photos available offline and avoids re-downloading them.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app);
  }
  return { auth: getAuth(app), db };
}

const services = init();

export const auth = services?.auth as Auth;
export const db = services?.db as Firestore;
