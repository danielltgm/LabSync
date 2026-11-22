
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Notice } from '@/components/common/ui';
import type { LabMapProps } from './LabMap';

export function LabMap({ markers, selected, onSelect }: LabMapProps) {
  const map = useRef<MapView>(null);
  const [loaded, setLoaded] = useState(false);
  const configured = Platform.OS !== 'android' || Constants.executionEnvironment === 'storeClient'
    || Constants.expoConfig?.extra?.androidMapsConfigured === true;
  const google = Platform.OS === 'android' || Constants.expoConfig?.extra?.iosMapsConfigured === true;
  const point = markers.find((marker) => marker.id === selected)?.coordinates ?? markers[0]?.coordinates;

  const latitude = point?.latitude;
  const longitude = point?.longitude;

  useEffect(() => {
    if (!loaded || latitude === undefined || longitude === undefined) return;
    map.current?.animateCamera({ center: { latitude, longitude } });
  }, [loaded, latitude, longitude]);

  if (!configured) return <Notice message="Peta belum tersedia di build ini." />;
  if (!point) return <Notice message="Koordinat lab belum tersedia." />;
  return (
    <View style={styles.frame}>
      <MapView provider={google ? PROVIDER_GOOGLE : undefined} ref={map} style={styles.map} initialRegion={{ ...point, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
        onMapReady={Platform.OS === 'ios' && !google ? () => setLoaded(true) : undefined}
        onMapLoaded={() => setLoaded(true)}>
        {markers.map(({ id, name, coordinates }) => (
          <Marker key={id} coordinate={coordinates} title={name} onPress={() => onSelect(id)} />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ frame: { gap: 8 }, map: { width: '100%', height: 300, borderRadius: 12 } });
