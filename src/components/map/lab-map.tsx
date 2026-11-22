import Constants from 'expo-constants';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform } from 'react-native';

import { LeafletWebView } from './leaflet-webview';
import { DEFAULT_ZOOM, type LabMapProps } from './types';

// Google Maps on Android crashes without android.config.googleMaps.apiKey, so builds without
// a key fall back to the Leaflet/OpenStreetMap map in a WebView (same map as the web build).
const HAS_GOOGLE_KEY = !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

// Native maps need a development build (expo-maps is not in Expo Go).
export function LabMap(props: LabMapProps) {
  if (Platform.OS === 'android' && !HAS_GOOGLE_KEY) return <LeafletWebView {...props} />;
  return <NativeLabMap {...props} />;
}

function NativeLabMap({ labs, selectedId, onSelectLab, user, busyLabIds = [], editing, focus, focusKey }: LabMapProps) {
  const target = focus ?? (editing ? { lat: editing.lat, lng: editing.lng } : labs[0]);
  const cameraPosition = target
    ? { coordinates: { latitude: target.lat, longitude: target.lng }, zoom: focus?.zoom ?? DEFAULT_ZOOM - 1 }
    : undefined;

  const markers = editing
    ? [{ id: 'editing', coordinates: { latitude: editing.lat, longitude: editing.lng }, title: 'Lokasi lab' }]
    : labs.map((lab) => ({
        id: lab.id,
        coordinates: { latitude: lab.lat, longitude: lab.lng },
        title: lab.name,
        snippet: busyLabIds.includes(lab.id) ? 'Sedang dipakai' : lab.building,
      }));

  const circles = editing
    ? [{ id: 'editing', center: { latitude: editing.lat, longitude: editing.lng }, radius: editing.radiusM, color: 'rgba(59,79,216,0.18)', lineColor: '#3B4FD8', lineWidth: 2 }]
    : labs.map((lab) => ({
        id: lab.id,
        center: { latitude: lab.lat, longitude: lab.lng },
        radius: lab.radiusM,
        color: busyLabIds.includes(lab.id) ? 'rgba(34,160,107,0.18)' : lab.id === selectedId ? 'rgba(59,79,216,0.18)' : 'rgba(91,98,128,0.08)',
        lineColor: busyLabIds.includes(lab.id) ? '#22A06B' : '#3B4FD8',
        lineWidth: 1,
      }));

  const onMarker = (m: { id?: string }) => m.id && !editing && onSelectLab?.(m.id);
  const onMapClick = (e: { coordinates: { latitude?: number; longitude?: number } }) => {
    if (editing && e.coordinates.latitude !== undefined && e.coordinates.longitude !== undefined) {
      editing.onMove({ lat: e.coordinates.latitude, lng: e.coordinates.longitude });
    }
  };

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        key={String(focusKey ?? '')}
        style={{ flex: 1 }}
        cameraPosition={cameraPosition}
        markers={markers}
        circles={circles}
        onMarkerClick={onMarker}
        onMapClick={onMapClick}
        properties={{ isMyLocationEnabled: !!user }}
      />
    );
  }
  return (
    <GoogleMaps.View
      key={String(focusKey ?? '')}
      style={{ flex: 1 }}
      cameraPosition={cameraPosition}
      markers={markers}
      circles={circles}
      onMarkerClick={onMarker}
      onMapClick={onMapClick}
      properties={{ isMyLocationEnabled: !!user }}
    />
  );
}
