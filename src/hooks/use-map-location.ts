
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/types/sprint3';

export function useMapLocation(active: boolean, requested: boolean, retry: number) {
  const [state, setState] = useState<{ coordinates?: Coordinates; message: string }>({ message: '' });

  useEffect(() => {
    if (!active || !requested) return;
    let disposed = false;
    let subscription: Location.LocationSubscription | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const update = (value: typeof state) => { if (!disposed) setState(value); };
    const start = async () => {
      update({ message: 'Memuat lokasi Anda…' });
      const permission = await Location.requestForegroundPermissionsAsync();
      if (disposed) return;
      if (!permission.granted) {
        update({ message: 'Izin lokasi ditolak. Anda bisa mengaktifkannya dari pengaturan perangkat.' });
        return;
      }
      if (!await Location.hasServicesEnabledAsync()) {
        update({ message: 'Layanan lokasi mati. Aktifkan GPS lalu coba lagi.' });
        return;
      }
      if (disposed) return;
      timer = setTimeout(() => update({ message: 'Lokasi belum ditemukan. Coba lagi di tempat terbuka.' }), 12_000);
      const watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 }, ({ coords }) => {
        clearTimeout(timer);
        update({ coordinates: { latitude: coords.latitude, longitude: coords.longitude }, message: '' });
      }, () => {
        clearTimeout(timer);
        update({ message: 'Lokasi gagal diperbarui. Periksa GPS atau izin perangkat.' });
      });
      if (disposed) watch.remove();
      else subscription = watch;
    };
    void start().catch(() => {
      clearTimeout(timer);
      update({ message: 'Lokasi tidak bisa diakses. Periksa izin dan pengaturan perangkat.' });
    });

    return () => {
      disposed = true;
      clearTimeout(timer);
      subscription?.remove();
    };
  }, [active, requested, retry]);

  return active && requested ? state : { message: '' };
}
