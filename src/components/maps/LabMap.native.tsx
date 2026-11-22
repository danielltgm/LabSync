
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Notice } from '@/components/common/ui';
import type { LabMapProps } from './LabMap';

export function LabMap({ markers, location, selected, onSelect }: LabMapProps) {
  const map = useRef<MapView>(null);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const configured = Platform.OS !== 'android' || Constants.executionEnvironment === 'storeClient'
    || Constants.expoConfig?.extra?.androidMapsConfigured === true;
  const google = Platform.OS === 'android' || Constants.expoConfig?.extra?.iosMapsConfigured === true;
  const point = markers.find((marker) => marker.id === selected)?.coordinates ?? markers[0]?.coordinates ?? location;

  const hasPoint = !!point;
  const latitude = point?.latitude;
  const longitude = point?.longitude;

  useEffect(() => {
    if (!configured || loaded || !hasPoint) return;
    const timer = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, [configured, loaded, hasPoint]);

  useEffect(() => {
    if (!loaded || latitude === undefined || longitude === undefined) return;
    map.current?.animateCamera({ center: { latitude, longitude } });
  }, [loaded, latitude, longitude]);

  if (!configured) return <Notice message="Google Maps Android belum dikonfigurasi di build ini. Daftar lab tetap tersedia." />;
  if (!point) return <Notice message="Peta menunggu koordinat lab resmi atau lokasi Anda." />;
  return (
    <View style={styles.frame}>
      <MapView provider={google ? PROVIDER_GOOGLE : undefined} ref={map} style={styles.map} initialRegion={{ ...point, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
        onMapReady={Platform.OS === 'ios' && !google ? () => { setLoaded(true); setTimedOut(false); } : undefined}
        onMapLoaded={() => { setLoaded(true); setTimedOut(false); }}>
        {markers.map(({ id, name, coordinates }) => (
          <Marker key={id} coordinate={coordinates} title={name} onPress={() => onSelect(id)} />
        ))}
        {location && <Marker coordinate={location} title="Lokasi Anda" pinColor="#1749bc" />}
      </MapView>
      {!loaded && <Notice message={timedOut
        ? 'Peta gagal dimuat. Cek jaringan atau konfigurasi API key di build ini.'
        : 'Memuat peta…'} />}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { gap: 8 }, map: { width: '100%', height: 300, borderRadius: 12 } });
