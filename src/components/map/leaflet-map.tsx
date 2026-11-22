import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { DEFAULT_ZOOM, labPins, type LabMapProps, type LatLng } from './types';

// OSM standard tiles are fine for development. For production, switch to a keyed provider (MapTiler, Stadia).
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; OpenStreetMap contributors';

// Dark mode: invert the raster tiles instead of needing a second (keyed) tile style.
if (typeof document !== 'undefined' && !document.getElementById('labsync-leaflet-dark')) {
  const style = document.createElement('style');
  style.id = 'labsync-leaflet-dark';
  style.textContent = '.labsync-tiles-dark{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9) saturate(.5)}';
  document.head.appendChild(style);
}

const BRAND = '#6B66F0';
const SUCCESS = '#F2684D';
const INFO = '#2F86C9';

function pin(label: string, color: string, selected: boolean) {
  const size = selected ? 46 : 38;
  return L.divIcon({
    className: '',
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,.25))">
        <div style="width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${color};border:3px solid #1B1B1B;display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${selected ? 13 : 11}px system-ui,sans-serif;letter-spacing:.3px">${label}</div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color};margin-top:-2px"></div>
      </div>`,
  });
}

function FlyTo({ focus, focusKey }: { focus?: LatLng & { zoom?: number }; focusKey?: number | string }) {
  const map = useMap();
  useEffect(() => {
    if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return;
    const target: [number, number] = [focus.lat, focus.lng];
    const zoom = focus.zoom ?? map.getZoom();
    // Leaflet's flyTo divides by the travel distance and the container size: flying to where the map
    // already is (e.g. on mount) or inside a hidden 0×0 container yields NaN and throws.
    const size = map.getSize();
    const travel = map.project(target, zoom).distanceTo(map.project(map.getCenter(), zoom));
    if (size.x === 0 || size.y === 0 || travel < 1) map.setView(target, zoom, { animate: false });
    else map.flyTo(target, zoom, { duration: 0.6 });
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToMove({ onMove }: { onMove: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function LeafletMap({ labs, selectedId, onSelectLab, user, busyLabIds = [], editing, focus, focusKey, dark }: LabMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (editing) return [editing.lat, editing.lng];
    if (!labs.length) return [-7.0487, 110.4413];
    const lat = labs.reduce((s, l) => s + l.lat, 0) / labs.length;
    const lng = labs.reduce((s, l) => s + l.lng, 0) / labs.length;
    return [lat, lng];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pins = labPins(labs, selectedId, busyLabIds);

  return (
    <MapContainer
      center={center}
      zoom={focus?.zoom ?? DEFAULT_ZOOM}
      zoomControl={false}
      attributionControl
      style={{ height: '100%', width: '100%', background: dark ? '#0F1120' : '#E9EEF5' }}
    >
      <TileLayer key={dark ? 'dark' : 'light'} url={TILES} attribution={ATTRIBUTION} maxZoom={19} className={dark ? 'labsync-tiles-dark' : undefined} />
      <FlyTo focus={focus} focusKey={focusKey} />

      {!editing &&
        pins.map((p) => {
          const color = p.busy ? SUCCESS : p.selected ? BRAND : '#1E1E1E';
          return (
            <Circle
              key={`r-${p.key}`}
              center={[p.lat, p.lng]}
              radius={p.radiusM}
              pathOptions={{ color, weight: p.selected ? 2 : 1, fillOpacity: p.selected ? 0.16 : 0.07, dashArray: p.selected ? undefined : '4 4' }}
            />
          );
        })}
      {!editing &&
        pins.map((p) => (
          <Marker
            key={p.key}
            position={[p.lat, p.lng]}
            icon={pin(p.label, p.busy ? SUCCESS : p.selected ? BRAND : '#1E1E1E', p.selected)}
            eventHandlers={{ click: () => onSelectLab?.(p.nextId) }}
            zIndexOffset={p.selected ? 1000 : p.busy ? 500 : 0}
          />
        ))}

      {editing && (
        <>
          <ClickToMove onMove={editing.onMove} />
          <Circle center={[editing.lat, editing.lng]} radius={editing.radiusM} pathOptions={{ color: BRAND, weight: 2, fillOpacity: 0.15 }} />
          <Marker
            position={[editing.lat, editing.lng]}
            draggable
            icon={pin('LAB', BRAND, true)}
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                editing.onMove({ lat: p.lat, lng: p.lng });
              },
            }}
          />
        </>
      )}

      {user && (
        <>
          {user.accuracyM ? (
            <Circle center={[user.lat, user.lng]} radius={user.accuracyM} pathOptions={{ color: INFO, weight: 0, fillOpacity: 0.12 }} />
          ) : null}
          <CircleMarker center={[user.lat, user.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: INFO, fillOpacity: 1 }} />
        </>
      )}
    </MapContainer>
  );
}
