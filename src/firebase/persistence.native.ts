import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as auth from 'firebase/auth';

// Metro selects the React Native export. The SDK's shared typings omit it.
const { getReactNativePersistence } = auth as typeof auth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => auth.Persistence;
};

export function createAuth(app: FirebaseApp) {
  return auth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
