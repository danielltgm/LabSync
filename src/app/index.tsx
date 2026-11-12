import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionCard } from '@/components/asisten/SessionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { SessionPraktikanCard } from '@/components/praktikan/SessionPraktikanCard';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { useAttendance } from '@/hooks/use-attendance';

export default function HomeScreen() {
  const { sessions, activeUser, loadingSessions, error, openSession, closeSession, logout } = useLabSync();
  const isAssistant = activeUser.role === 'ASISTEN';
  const attendance = useAttendance(isAssistant ? undefined : activeUser.id);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={SessionSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.brand}>LabSync</Text>
            <Text style={styles.identity}>
              {activeUser.name} · {activeUser.identifier} · {isAssistant ? 'Asisten' : 'Praktikan'}
            </Text>
            <Pressable accessibilityRole="button" onPress={logout} style={styles.button}>
              <Text style={styles.linkLabel}>Keluar</Text>
            </Pressable>
            {!isAssistant && (
              <Pressable accessibilityRole="button" onPress={() => router.push('/history')} style={styles.button}>
                <Text style={styles.linkLabel}>Riwayat Saya</Text>
              </Pressable>
            )}
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Jadwal praktikum</Text>
              {!loadingSessions && <Text style={styles.caption}>{sessions.length} sesi</Text>}
            </View>
            {!!(error || attendance.error) && <Text accessibilityRole="alert" style={styles.body}>{error || attendance.error}</Text>}
          </View>
        }
        ListEmptyComponent={loadingSessions
          ? <ActivityIndicator color={colors.primary} />
          : error ? undefined : <EmptyState title="Belum ada jadwal praktikum" description="Jadwal akan muncul saat sesi tersedia." />}
        renderItem={({ item }) => isAssistant ? (
          <SessionCard
            session={item}
            role={activeUser.role}
            onOpenSession={openSession}
            onCloseSession={closeSession}
            onViewRecap={(id) => router.push({ pathname: '/rekap/[id]', params: { id } })}
          />
        ) : (
          <SessionPraktikanCard session={item} isAttended={attendance.records.some((record) => record.sessionId === item.id)} />
        )}
      />
    </SafeAreaView>
  );
}

function SessionSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xxxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space.lg, paddingBottom: space.xl },
  brand: { ...type.title, color: colors.primary },
  identity: { ...type.button, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  button: { minHeight: 48, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderDark, justifyContent: 'center', alignItems: 'center' },
  linkLabel: { ...type.button, color: colors.primary, textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  sectionTitle: { ...type.section, color: colors.text },
  caption: { ...type.caption, color: colors.textSecondary },
  separator: { height: space.lg },
});
