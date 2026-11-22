import { createRequire } from 'node:module';

// Resolve Admin and its gRPC dependencies in the Node server, outside Metro.
const requireAdmin = createRequire(process.cwd() + '/package.json');
const { cert, getApps, initializeApp } = requireAdmin('firebase-admin/app') as typeof import('firebase-admin/app');
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
  const existing = getApps().find((app) => app.name === projectId);
  if (existing) return existing;

  const encoded = process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64;
  if (encoded && !emulators) {
    try {
      const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      if (credentials.project_id !== projectId) return null;
      return configure(initializeApp({ projectId, credential: cert(credentials) }, projectId));
    } catch {
      return null;
    }
  }

  return configure(initializeApp({ projectId }, projectId));
}

/** App types have optional fields; Firestore rejects `undefined`, so drop them on write. */
function configure<T extends Parameters<typeof getFirestore>[0]>(app: T) {
  getFirestore(app).settings({ ignoreUndefinedProperties: true });
  return app;
}
