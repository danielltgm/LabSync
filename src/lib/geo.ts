const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Moves a coordinate by meters north/east. Used for demo positions. */
export function offsetMeters(origin: { lat: number; lng: number }, northM: number, eastM: number) {
  const lat = origin.lat + (northM / EARTH_RADIUS_M) * (180 / Math.PI);
  const lng = origin.lng + ((eastM / EARTH_RADIUS_M) * (180 / Math.PI)) / Math.cos(toRad(origin.lat));
  return { lat, lng };
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
