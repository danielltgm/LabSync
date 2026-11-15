import { useSyncExternalStore } from 'react';
import { useWindowDimensions } from 'react-native';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Use the compact layout during web hydration, then measure the actual window.
export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const scale = Math.max(1, fontScale);
  return {
    width: mounted ? width : 0,
    compact: !mounted || width < 380,
    wide: mounted && width >= 760 * scale,
    split: mounted && width >= 920 * scale,
    short: !mounted || height < 600,
  };
}
