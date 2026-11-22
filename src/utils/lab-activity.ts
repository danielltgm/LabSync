import type { Coordinates } from '@/types/sprint3';

export function mapCoordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object') return null;
  const { latitude, longitude } = value as Partial<Coordinates>;
  return typeof latitude === 'number' && Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' && Math.abs(longitude) <= 180
    ? { latitude, longitude } : null;
}
