import { useEffect, useState } from 'react';

/**
 * Ticking clock. In production this is server time: Date.now() + offset measured
 * against the API's Date header, so a wrong phone clock cannot open a window.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now() + serverOffsetMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + serverOffsetMs), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Measured drift between this device and the server. Demo: none. */
export let serverOffsetMs = 0;

export function setServerOffset(ms: number) {
  serverOffsetMs = ms;
}
