import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import {
  resolveCameraGateState,
  type CameraGateState,
} from '@/services/attendance/camera-state';

export interface CameraGateController {
  state: CameraGateState;
  startScan: () => Promise<void>;
  stopScan: () => void;
  openSettings: () => void;
}

export function useCameraGate(enabled: boolean): CameraGateController {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanRequested, setScanRequested] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setScanRequested(false);
      };
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const active = nextState === 'active';
      setIsAppActive(active);
      if (!active) setScanRequested(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled) setScanRequested(false);
  }, [enabled]);

  const startScan = useCallback(async () => {
    if (!enabled || Platform.OS === 'web') return;
    setScanRequested(true);
    if (!permission?.granted && permission?.canAskAgain !== false) {
      await requestPermission();
    }
  }, [enabled, permission, requestPermission]);

  const stopScan = useCallback(() => setScanRequested(false), []);
  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const state = resolveCameraGateState({
    platform: Platform.OS,
    scanRequested: enabled && scanRequested,
    permission,
    isScreenActive: isFocused && isAppActive,
  });

  return { state, startScan, stopScan, openSettings };
}
