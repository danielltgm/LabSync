import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { Uniwind, useUniwind } from 'uniwind';

import { THEME } from '@/lib/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'labsync.theme';
let preference: ThemePreference = 'system';
const listeners = new Set<() => void>();

export function setThemePreference(next: ThemePreference) {
  preference = next;
  Uniwind.setTheme(next);
  AsyncStorage.setItem(KEY, next).catch(() => undefined);
  listeners.forEach((l) => l());
}

export function useThemePreference() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => preference,
    () => preference,
  );
}

/** Restores the saved preference once on boot. */
export function useRestoreTheme() {
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setThemePreference(saved);
      })
      .catch(() => undefined);
  }, []);
}

/** Resolved scheme plus raw color values for non-className APIs. */
export function useColors() {
  const { theme } = useUniwind();
  const scheme = theme === 'dark' ? 'dark' : 'light';
  return { scheme, colors: THEME[scheme] } as const;
}
