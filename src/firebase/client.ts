import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { createAuth } from './persistence';

const useEmulators = process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === 'true';
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';

const config = useEmulators ? {
  apiKey: 'demo-labsync',
  authDomain: 'demo-labsync.firebaseapp.com',
  projectId: 'demo-labsync',
  appId: 'demo-labsync',
} : {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function setupFirebase() {
  if (Object.values(config).some((value) => !value?.trim())) return null;

  const appExists = getApps().length > 0;
  const app = appExists ? getApp() : initializeApp(config);
  const auth = appExists ? getAuth(app) : createAuth(app);
  const db = getFirestore(app);

  if (useEmulators && !appExists) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }
  return { auth, db };
}

export const firebase = setupFirebase();
