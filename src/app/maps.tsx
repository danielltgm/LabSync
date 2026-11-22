
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionRow, Button, LoadingLine, Notice } from '@/components/common/ui';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LabMap } from '@/components/maps/LabMap';
import { LabSyncColors, LabSyncTypography } from '@/constants/labsync-theme';
import { useLabActivity, useLabs } from '@/hooks/use-lab-map';
import { useMapLocation } from '@/hooks/use-map-location';
import type { LabId } from '@/types/sprint3';
import { activityDays, type MapActivity } from '@/utils/lab-activity';

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });

export default function MapsScreen() {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [selected, setSelected] = useState<LabId | null>(null);
  const [retry, setRetry] = useState(0);
  const [locationRetry, setLocationRetry] = useState(0);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);

  const active = focused && foreground;
  const labs = useLabs(active, retry);
  const activity = useLabActivity(selected, active, retry);
  const location = useMapLocation(active, locationRetry > 0, locationRetry);
  const markers = labs.labs.flatMap((lab) => lab.coordinates ? [{ ...lab, coordinates: lab.coordinates }] : []);
  const selectedLab = labs.labs.find((lab) => lab.id === selected);

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
        {!!location.message && <Notice message={location.message} />}
        {!!labs.error && <Notice tone="warning" message={labs.error}>
          <Button compact label="Muat ulang lab" onPress={() => setRetry((value) => value + 1)} />
        </Notice>}
        {labs.loading && <LoadingLine label="Memuat lab…" />}
        <Text accessibilityRole="header" style={styles.subtitle}>Pilih laboratorium</Text>
        <View style={styles.choices}>
          {labs.labs.map((lab) => <Button key={lab.id} variant={selected === lab.id ? 'primary' : 'secondary'}
            label={lab.name + (lab.coordinates ? '' : ' · titik belum tersedia')} onPress={() => setSelected(lab.id)} />)}
        </View>
        {selectedLab && <View style={styles.activity}>
          <Text accessibilityRole="header" style={styles.subtitle}>{selectedLab.name}</Text>
          {activity.loading && <LoadingLine label="Memuat aktivitas…" />}
          {!!activity.error && <Notice tone="warning" message={activity.error}>
            <Button compact label="Muat ulang aktivitas" onPress={() => setRetry((value) => value + 1)} />
          </Notice>}
          {!activity.loading && <>
            <Text style={styles.label}>Sekarang</Text>
            {activity.current.length > 0 ? activity.current.map((item) => <Activity key={item.sessionId} item={item} />)
              : !activity.error && <Text>Belum ada aktivitas yang sedang berlangsung.</Text>}
            <Text style={styles.label}>Berikutnya</Text>
            {activity.next ? <Activity item={activity.next} /> : !activity.error &&
              <Text>Tidak ada jadwal berikutnya dalam rentang {activityDays} hari ini, sampai {dateTime.format(activity.end)} WIB.</Text>}
          </>}
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Activity({ item }: { item: MapActivity }) {
  return <View style={styles.item}>
    <Text style={styles.label}>{item.courseName}</Text>
    <Text>{item.className}</Text>
    <Text>{dateTime.format(item.start)} – {dateTime.format(item.end)} WIB</Text>
    <StatusBadge status={item.status} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: LabSyncColors.background },
  content: { gap: 16, width: '100%', maxWidth: 860, alignSelf: 'center', padding: 20 },
  title: { ...LabSyncTypography.title, color: LabSyncColors.text },
  subtitle: { ...LabSyncTypography.heading, color: LabSyncColors.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activity: { gap: 10 },
  label: { fontWeight: '700', color: LabSyncColors.text },
  item: { borderWidth: 1, borderColor: LabSyncColors.rule, borderRadius: 10, padding: 14, gap: 5, alignItems: 'flex-start' },
});
