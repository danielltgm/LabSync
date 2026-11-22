import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type PushPermission = 'granted' | 'denied' | 'undetermined';
/** Where the bar sits on tablets / desktop. Phones always use the bottom bar. */
export type BarPlacement = 'left' | 'right' | 'bottom';

export interface Prefs {
  push: PushPermission;
  reminderMin: 0 | 15 | 30 | 60;
  notifySessionOpened: boolean;
  notifySchedule: boolean;
  notifyLeave: boolean;
  barPlacement: BarPlacement;
}

const KEY = 'labsync.prefs';
let prefs: Prefs = { push: 'granted', reminderMin: 15, notifySessionOpened: true, notifySchedule: true, notifyLeave: true, barPlacement: 'left' };
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) {
        prefs = { ...prefs, ...(JSON.parse(raw) as Partial<Prefs>) };
        listeners.forEach((l) => l());
      }
    })
    .catch(() => undefined);
}

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => undefined);
  listeners.forEach((l) => l());
}

export function usePrefs() {
  load();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => prefs,
    () => prefs,
  );
}
