
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionRow, Button, LoadingLine } from '@/components/common/ui';
import { LabMap } from '@/components/maps/LabMap';
import { LabSyncColors, LabSyncTypography } from '@/constants/labsync-theme';
import { useLabs } from '@/hooks/use-lab-map';
import { useMapLocation } from '@/hooks/use-map-location';
import type { LabId } from '@/types/sprint3';

export default function MapsScreen() {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [selected, setSelected] = useState<LabId | null>(null);
  const [locationRetry, setLocationRetry] = useState(0);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);

  const active = focused && foreground;
  const labs = useLabs(active);
  const location = useMapLocation(active, locationRetry > 0, locationRetry);
  const markers = labs.labs.flatMap((lab) => lab.coordinates ? [{ ...lab, coordinates: lab.coordinates }] : []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionRow>
          <Button compact variant="quiet" label="Kembali" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        </ActionRow>
        <Text accessibilityRole="header" style={styles.title}>Peta laboratorium</Text>
        <LabMap markers={markers} location={location.coordinates} selected={selected} onSelect={setSelected} />
        <ActionRow><Button compact label={locationRetry > 0 ? 'Perbarui lokasi' : 'Tampilkan lokasi saya'}
          onPress={() => setLocationRetry((value) => value + 1)} /></ActionRow>
        {labs.loading && <LoadingLine label="Memuat lab…" />}
        <Text accessibilityRole="header" style={styles.subtitle}>Pilih laboratorium</Text>
        <View style={styles.choices}>
          {labs.labs.map((lab) => <Button key={lab.id} variant={selected === lab.id ? 'primary' : 'secondary'}
            label={lab.name + (lab.coordinates ? '' : ' · titik belum tersedia')} onPress={() => setSelected(lab.id)} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: LabSyncColors.background },
  content: { gap: 16, width: '100%', maxWidth: 860, alignSelf: 'center', padding: 20 },
  title: { ...LabSyncTypography.title, color: LabSyncColors.text },
  subtitle: { ...LabSyncTypography.heading, color: LabSyncColors.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
