import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EnrollmentList } from '@/components/manage/EnrollmentList';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { firebase } from '@/firebase/client';
import { watchClass, type ManagedClass } from '@/firebase/queries';
import { useSessionManagement } from '@/hooks/useSessionManagement';

export default function ClassDetailManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = Array.isArray(id) ? id[0] : id;

  const [snapshot, setSnapshot] = useState<{ id: string; data: ManagedClass | null }>();

  const { sessions, loading: sessionsLoading, deleteSession } = useSessionManagement(classId);

  useEffect(() => {
    if (!firebase || !classId) return;

    return watchClass(
      firebase.db,
      classId,
      (data) => setSnapshot({ id: classId, data }),
      () => setSnapshot({ id: classId, data: null })
    );
  }, [classId]);

  const classData = snapshot && snapshot.id === classId ? snapshot.data : null;
  const classLoading = !snapshot && !!classId;

  if (classLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>Kelas Tidak Ditemukan</Text>
          <Button title="Kembali ke Daftar Kelas" onPress={() => router.replace('/manage')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>{classData.name}</Text>
          <Text style={styles.subtitle}>ID Kelas: {classData.id}</Text>
        </View>
        <Button title="Kembali" onPress={() => router.back()} color={colors.textSecondary} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <EnrollmentList classId={classData.id} />

            <View style={styles.sessionsBar}>
              <View>
                <Text style={styles.sectionTitle}>Sesi Praktikum Terjadwal</Text>
                <Text style={styles.sectionSubtitle}>Daftar pertemuan praktikum pada kelas ini.</Text>
              </View>
              <Button
                title="+ Tambah Sesi"
                onPress={() => router.push({
                  pathname: '/manage/session/create',
                  params: { classId: classData.id, className: classData.name },
                })}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          !sessionsLoading ? (
            <EmptyState
              title="Belum Ada Sesi Praktikum"
              description="Buat jadwal sesi baru untuk kelas ini agar praktikan dapat melihat jadwal."
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <View style={styles.sessionMain}>
              <View style={styles.sessionRow}>
                <Text style={styles.sessionCourse}>{item.courseName}</Text>
                <StatusBadge status={item.status} />
              </View>

              <Text style={styles.sessionDetails}>
                Ruang: {item.labRoom} • {item.date} ({item.startTime} - {item.endTime})
              </Text>
              <Text style={styles.sessionAssistant}>Asisten: {item.assistantName}</Text>
            </View>

            {item.status === 'TERJADWAL' && (
              <View style={styles.sessionActions}>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => { void deleteSession(item.id); }}
                >
                  <Text style={styles.deleteText}>Hapus Sesi</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { marginVertical: space.xxl },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md },
  header: {
    padding: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    backgroundColor: colors.surface,
  },
  title: { ...type.title, color: colors.primary },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: space.xs },
  content: { padding: space.lg, gap: space.md },
  sectionHeader: { gap: space.lg, marginBottom: space.md },
  sessionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
  },
  sectionTitle: { ...type.heading, color: colors.text },
  sectionSubtitle: { ...type.caption, color: colors.textSecondary },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.lg,
    borderColor: colors.borderDark,
    borderWidth: 1,
    gap: space.md,
  },
  sessionMain: { gap: space.xs },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionCourse: { ...type.section, color: colors.text, fontWeight: '700' },
  sessionDetails: { ...type.body, color: colors.textSecondary },
  sessionAssistant: { ...type.caption, color: colors.textSecondary },
  sessionActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  deleteButton: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
  },
  deleteText: { ...type.button, color: colors.danger.text },
});
