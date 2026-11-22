
import type { Coordinates } from '@/types/sprint3';

const dayMs = 86_400_000;
const wibOffset = 7 * 3_600_000;
export const activityDays = 7;

export function activityWindow(now: number) {
  const start = Math.floor((now + wibOffset) / dayMs) * dayMs - wibOffset;
  return { start, end: start + activityDays * dayMs, rollover: start + dayMs };
}

export function mapCoordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object') return null;
  const { latitude, longitude } = value as Partial<Coordinates>;
  return typeof latitude === 'number' && Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' && Math.abs(longitude) <= 180
    ? { latitude, longitude } : null;
}

export interface MapActivity {
  sessionId: string;
  courseName: string;
  className: string;
  start: number;
  end: number;
  status: 'TERJADWAL' | 'DIBUKA';
}

export function activityAt(items: MapActivity[], now: number) {
  const ordered = items.slice().sort((a, b) => a.start - b.start || a.sessionId.localeCompare(b.sessionId));
  return {
    current: ordered.filter((item) => item.start <= now && now < item.end),
    next: ordered.find((item) => item.start > now),
  };
}
