import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';

import { offsetMeters } from '@/lib/geo';
import type { Position } from '@/data/types';

export type LocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'services-off' }
  | { status: 'searching' }
  | { status: 'ready'; position: Position }
  | { status: 'error'; message: string };

/* ----------------------------------------------------- demo simulation */

export type SimulatedSpot = 'off' | 'inside' | 'edge' | 'outside' | 'far' | 'weak' | 'mock' | 'denied' | 'services-off';

export const SIMULATED_SPOTS: { value: SimulatedSpot; label: string; hint: string }[] = [
  { value: 'off', label: 'GPS asli', hint: 'Pakai lokasi perangkat' },
  { value: 'inside', label: 'Di dalam lab', hint: '± 8 m dari titik lab' },
  { value: 'edge', label: 'Tepi radius', hint: '± 32 m' },
  { value: 'outside', label: 'Di luar radius', hint: '± 140 m' },
  { value: 'far', label: 'Jauh dari kampus', hint: '± 3 km' },
  { value: 'weak', label: 'Sinyal lemah', hint: 'Akurasi 80 m' },
  { value: 'mock', label: 'Lokasi palsu', hint: 'Fake GPS terdeteksi' },
  { value: 'denied', label: 'Izin ditolak', hint: 'Uji pesan error' },
  { value: 'services-off', label: 'GPS mati', hint: 'Layanan lokasi nonaktif' },
];

// Development builds on web start inside the lab radius; release builds always use real GPS.
let simulated: SimulatedSpot = __DEV__ && Platform.OS === 'web' ? 'inside' : 'off';
const listeners = new Set<() => void>();

export function setSimulatedSpot(spot: SimulatedSpot) {
  simulated = spot;
  listeners.forEach((l) => l());
}

export function useSimulatedSpot() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => simulated,
    () => simulated,
  );
}

function simulate(spot: SimulatedSpot, anchor: { lat: number; lng: number }, jitter: number): LocationState {
  const wobble = Math.sin(jitter) * 2;
  const at = Date.now();
  switch (spot) {
    case 'inside':
      return { status: 'ready', position: { ...offsetMeters(anchor, 6 + wobble, 5), accuracyM: 9, at } };
    case 'edge':
      return { status: 'ready', position: { ...offsetMeters(anchor, 24 + wobble, 21), accuracyM: 14, at } };
    case 'outside':
      return { status: 'ready', position: { ...offsetMeters(anchor, 110 + wobble, 88), accuracyM: 12, at } };
    case 'far':
      return { status: 'ready', position: { ...offsetMeters(anchor, 2400, -1800), accuracyM: 20, at } };
    case 'weak':
      return { status: 'ready', position: { ...offsetMeters(anchor, 10 + wobble * 6, -8), accuracyM: 80, at } };
    case 'mock':
      return { status: 'ready', position: { ...offsetMeters(anchor, 1, 1), accuracyM: 3, mocked: true, at } };
    case 'denied':
      return { status: 'denied', canAskAgain: false };
    case 'services-off':
      return { status: 'services-off' };
    default:
      return { status: 'idle' };
  }
}

/* -------------------------------------------------------------- hook */

/**
 * Watches the device position while the screen is mounted.
 * `anchor` is the lab used for simulated positions in demo mode.
 */
export function useLiveLocation(anchor?: { lat: number; lng: number }, enabled = true) {
  const spot = useSimulatedSpot();
  const [deviceState, setState] = useState<LocationState>({ status: 'idle' });
  const [tick, setTick] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [simReadyFor, setSimReadyFor] = useState('');
  const sub = useRef<Location.LocationSubscription | null>(null);
  const simulating = enabled && spot !== 'off' && !!anchor;
  const simKey = `${spot}|${attempt}|${anchor?.lat}|${anchor?.lng}`;

  // Simulated feed: a short "searching" phase, then a fix every 2 s so the UI feels live.
  useEffect(() => {
    if (!simulating) return;
    const first = setTimeout(() => setSimReadyFor(simKey), 700);
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [simulating, simKey]);

  const state: LocationState = simulating
    ? simReadyFor === simKey
      ? simulate(spot, anchor!, tick)
      : { status: 'searching' }
    : deviceState;

  // Real device feed.
  useEffect(() => {
    if (!enabled || spot !== 'off') return;
    let cancelled = false;
    (async () => {
      try {
        setState({ status: 'requesting' });
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission.status !== 'granted') {
          setState({ status: 'denied', canAskAgain: permission.canAskAgain });
          return;
        }
        const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
        if (cancelled) return;
        if (!servicesOn) {
          setState({ status: 'services-off' });
          return;
        }
        setState({ status: 'searching' });
        sub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 2000 },
          (loc) => {
            if (cancelled) return;
            setState({
              status: 'ready',
              position: {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                accuracyM: loc.coords.accuracy ?? 999,
                mocked: loc.mocked,
                at: loc.timestamp,
              },
            });
          },
          (reason) => !cancelled && setState({ status: 'error', message: String(reason) }),
        );
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : 'Lokasi tidak tersedia.' });
      }
    })();
    return () => {
      cancelled = true;
      sub.current?.remove();
      sub.current = null;
    };
  }, [enabled, spot, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const openSettings = useCallback(() => {
    if (Platform.OS !== 'web') void Linking.openSettings();
  }, []);

  return { state, retry, openSettings, simulated: spot !== 'off' };
}
