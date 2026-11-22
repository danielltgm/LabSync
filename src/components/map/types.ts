import type { Lab } from '@/data/types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LabMapProps {
  labs: Lab[];
  selectedId?: string | null;
  onSelectLab?: (id: string) => void;
  /** Live device position. */
  user?: (LatLng & { accuracyM?: number }) | null;
  /** Labs with a session in progress get a green pin. */
  busyLabIds?: string[];
  /** Edit mode: one movable pin with its radius. Tapping the map moves it. */
  editing?: LatLng & { radiusM: number; onMove: (p: LatLng) => void };
  /** Change this value to fly the camera to `focus`. */
  focusKey?: number | string;
  focus?: LatLng & { zoom?: number };
  dark?: boolean;
}

export const DEFAULT_ZOOM = 18;

/**
 * Labs that share one point (B, C, D all use the Gedung E reference) become one pin.
 * Tapping a stacked pin selects the next room in it, so B → C → D → B.
 */
export interface LabPin {
  key: string;
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
  selected: boolean;
  busy: boolean;
  /** Lab selected when the pin is tapped. */
  nextId: string;
}

const short = (code: string) => code.split('-')[1] ?? code;

export function labPins(labs: Lab[], selectedId: string | null | undefined, busyIds: string[]): LabPin[] {
  const groups = new Map<string, Lab[]>();
  for (const l of labs) {
    const k = `${l.lat.toFixed(6)},${l.lng.toFixed(6)}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return [...groups.entries()].map(([key, g]) => {
    const at = g.findIndex((l) => l.id === selectedId);
    const label = g.length === 1 ? short(g[0].code) : at >= 0 ? `${short(g[at].code)}+${g.length - 1}` : g.length <= 3 ? g.map((l) => short(l.code)).join('') : `${short(g[0].code)}+${g.length - 1}`;
    return {
      key,
      lat: g[0].lat,
      lng: g[0].lng,
      radiusM: Math.max(...g.map((l) => l.radiusM)),
      label,
      selected: at >= 0,
      busy: g.some((l) => busyIds.includes(l.id)),
      nextId: g[(at + 1) % g.length].id,
    };
  });
}
