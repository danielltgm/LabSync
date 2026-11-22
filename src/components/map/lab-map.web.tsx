import { lazy, Suspense, useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { LabMapProps } from './types';

// Leaflet touches `window` on import, so it only loads in the browser (never during SSR).
const LeafletMap = lazy(() => import('./leaflet-map'));
const noop = () => () => {};

export function LabMap(props: LabMapProps) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const fallback = (
    <View className="bg-muted flex-1 items-center justify-center">
      <ActivityIndicator />
    </View>
  );
  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <LeafletMap {...props} />
    </Suspense>
  );
}
