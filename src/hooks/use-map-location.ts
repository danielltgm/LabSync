
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/types/sprint3';

export function useMapLocation(active: boolean, requested: boolean, retry: number) {
  const [state, setState] = useState<{ coordinates?: Coordinates; message: string }>({ message: '' });

  useEffect(() => {
    if (!active || !requested) return;
    let disposed = false;
    let subscription: Location.LocationSubscription | undefined;
    const update = (value: typeof state) => { if (!disposed) setState(value); };
    const start = async () => {
      update({ message: 'Memuat lokasi Anda…' });
      const permission = await Location.requestForegroundPermissionsAsync();
      if (disposed) return;
      if (!permission.granted) return;
      const watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 }, ({ coords }) => {
          update({ coordinates: { latitude: coords.latitude, longitude: coords.longitude }, message: '' });
      });
      if (disposed) watch.remove();
      else subscription = watch;
    };
    void start().catch(() => undefined);

    return () => {
      disposed = true;
      subscription?.remove();
    };
  }, [active, requested, retry]);

  return active && requested ? state : { message: '' };
}
