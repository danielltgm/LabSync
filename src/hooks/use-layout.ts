import { useSyncExternalStore } from 'react';
import { useWindowDimensions } from 'react-native';

/** Tablets (portrait included) and desktop web switch to the side rail. */
export const WIDE_MIN = 768;
/** Dashboards split into main + side columns from here (landscape tablets, desktop). Portrait tablets stay single column. */
export const SPLIT_MIN = 960;

const noopSubscribe = () => () => {};

/**
 * Responsive layout flags. The server HTML (web) has no window size, so server render and
 * hydration use the phone layout (getServerSnapshot = false) and the client switches right after.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const w = hydrated ? width : 0;
  const wide = w >= WIDE_MIN;
  return { width: w, wide, split: w >= SPLIT_MIN, cols: w >= 1180 ? 3 : wide ? 2 : 1 };
}
