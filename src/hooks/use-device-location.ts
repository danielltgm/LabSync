import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import {
  DEFAULT_LOCATION_POLICY,
  validateDeviceLocationFix,
  type LocationValidationErrorCode,
} from '@/services/attendance/location-validator';
import type { DeviceLocationFix, Sprint3PolicyDraft } from '@/types/sprint3';

export type DeviceLocationStatus =
  | 'idle'
  | 'acquiring'
  | 'permission-denied'
  | 'permission-blocked'
  | 'services-disabled'
  | 'invalid'
  | 'timeout'
  | 'error'
  | 'ready';

export interface DeviceLocationController {
  status: DeviceLocationStatus;
  fix: DeviceLocationFix | null;
  errorCode: LocationValidationErrorCode | null;
  message: string | null;
  refreshLocation: () => Promise<DeviceLocationFix | null>;
  openSettings: () => void;
}

const LOCATION_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function useDeviceLocation(
  policy: Pick<Sprint3PolicyDraft, 'maxLocationAgeMs' | 'maxAccuracyMeters' | 'maxFutureSkewMs'> = DEFAULT_LOCATION_POLICY,
): DeviceLocationController {
  const [status, setStatus] = useState<DeviceLocationStatus>('idle');
  const [fix, setFix] = useState<DeviceLocationFix | null>(null);
  const [errorCode, setErrorCode] = useState<LocationValidationErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshLocation = useCallback(async (): Promise<DeviceLocationFix | null> => {
    setStatus('acquiring');
    setErrorCode(null);
    setMessage(null);

    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (!mountedRef.current) return null;

      if (!perm.granted) {
        setFix(null);
        setStatus(perm.canAskAgain ? 'permission-denied' : 'permission-blocked');
        setMessage(
          perm.canAskAgain
            ? 'Izin lokasi diperlukan untuk memverifikasi kehadiran di laboratorium.'
            : 'Izin lokasi diblokir. Aktifkan izin lokasi LabSync melalui Pengaturan perangkat.',
        );
        return null;
      }

      const provider = await Location.getProviderStatusAsync();
      if (!mountedRef.current) return null;
      if (!provider.locationServicesEnabled) {
        setFix(null);
        setStatus('services-disabled');
        setMessage('Layanan lokasi (GPS) perangkat mati. Aktifkan GPS lalu ambil ulang lokasi.');
        return null;
      }

      const raw = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        LOCATION_TIMEOUT_MS,
      );
      if (!mountedRef.current) return null;

      const candidate: DeviceLocationFix = {
        latitude: raw.coords.latitude,
        longitude: raw.coords.longitude,
        accuracyMeters: raw.coords.accuracy ?? Number.NaN,
        capturedAtMs: raw.timestamp || Date.now(),
      };

      const validation = validateDeviceLocationFix(candidate, policy, Date.now());
      if (!validation.ok) {
        setFix(candidate);
        setErrorCode(validation.code);
        setStatus('invalid');
        setMessage(validation.message);
        return null;
      }

      setFix(candidate);
      setErrorCode(null);
      setStatus('ready');
      setMessage(null);
      return candidate;
    } catch (err: unknown) {
      if (!mountedRef.current) return null;
      setFix(null);
      const isTimeout = err instanceof Error && err.message === 'LOCATION_TIMEOUT';
      setStatus(isTimeout ? 'timeout' : 'error');
      setMessage(
        isTimeout
          ? 'Pengambilan lokasi GPS melebihi batas waktu. Coba ambil ulang di dekat jendela/area terbuka.'
          : 'Lokasi perangkat gagal diperoleh. Periksa sinyal GPS lalu coba lagi.',
      );
      return null;
    }
  }, [policy]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { status, fix, errorCode, message, refreshLocation, openSettings };
}
