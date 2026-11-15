import { createRequire } from 'node:module';

// Resolve Admin and its gRPC dependencies in the Node server, outside Metro.
const requireAdmin = createRequire(process.cwd() + '/package.json');
const { getApps, initializeApp } = requireAdmin('firebase-admin/app') as typeof import('firebase-admin/app');
export const { getAuth } = requireAdmin('firebase-admin/auth') as typeof import('firebase-admin/auth');
export const { FieldPath, FieldValue, getFirestore, Timestamp } =
  requireAdmin('firebase-admin/firestore') as typeof import('firebase-admin/firestore');

export function getAdminApp() {
  const emulators = process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === 'true';
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulators ? !authHost || !firestoreHost : authHost || firestoreHost) return null;
  const projectId = emulators ? 'demo-labsync' : process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return getApps().find((app) => app.name === projectId) ?? initializeApp({ projectId }, projectId);
}
