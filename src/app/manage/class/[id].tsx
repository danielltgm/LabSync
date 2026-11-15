import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { formatSessionDate } from '@/components/common/SessionSheet';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ActionRow, Button, LoadingLine, MetaList, MetaRow, Notice, PageHeader, Panel } from '@/components/common/ui';
import { EnrollmentList } from '@/components/manage/EnrollmentList';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { firebase } from '@/firebase/client';
import { watchClass, type ManagedClass } from '@/firebase/queries';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useSessionManagement } from '@/hooks/useSessionManagement';

export default function ClassDetailManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const { compact, wide } = useResponsiveLayout();

  const [snapshot, setSnapshot] = useState<{ id: string; data: ManagedClass | null }>();

  const [actionError, setActionError] = useState('');
  const { sessions, loading: sessionsLoading, busy, error, deleteSession } = useSessionManagement(classId);

  useEffect(() => {
    if (!firebase || !classId) return;

    return watchClass(
      firebase.db,
      classId,
      (data) => setSnapshot({ id: classId, data }),
      () => setSnapshot({ id: classId, data: null })
    );
  }, [classId]);

  const displayedError = actionError || error;
  const classData = snapshot && snapshot.id === classId ? snapshot.data : null;
  const classLoading = snapshot?.id !== classId && !!classId;

  if (classLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <LoadingLine label="Memuat data..." />
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyContainer}>
          <EmptyState title="Kelas Tidak Ditemukan">
            <Button variant="primary" label="Kembali ke Daftar Kelas" onPress={() => router.replace('/manage')} style={styles.emptyAction} />
          </EmptyState>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, compact && styles.contentCompact, wide && styles.contentWide]}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <PageHeader title={classData.name} onBack={() => router.back()}>
              <Text selectable style={styles.classId}>ID Kelas: {classData.id}</Text>
            </PageHeader>
            {displayedError && <Notice tone="danger" message={displayedError} alert />}
            <EnrollmentList key={classData.id} classId={classData.id} />

            <View style={styles.sessionsBar}>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Sesi Praktikum Terjadwal</Text>
                <Text style={styles.sectionSubtitle}>Daftar pertemuan praktikum pada kelas ini.</Text>
              </View>
              <Button
                variant="primary"
                label="+ Tambah Sesi"
                onPress={() => router.push({
                  pathname: '/manage/session/create',
                  params: { classId: classData.id, className: classData.name },
                })}
                style={styles.addButton}
              />
            </View>
            {sessionsLoading && <LoadingLine label="Memuat jadwal…" />}
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
          <Panel accent={item.status === 'DIBUKA' ? colors.success.solid : undefined}>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionDate}>{formatSessionDate(item.date)}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.sessionCourse}>{item.courseName}</Text>
            <MetaList>
              <MetaRow label="Waktu" value={`${item.startTime} - ${item.endTime}`} mono />
              <MetaRow label="Ruang" value={item.labRoom} />
              <MetaRow label="Asisten" value={item.assistantName} />
            </MetaList>

            {item.status === 'TERJADWAL' && (
              <ActionRow style={styles.sessionActions}>
                <Button
                  label="Edit sesi"
                  accessibilityLabel={`Edit sesi ${item.courseName}`}
                  onPress={() => router.push({
                    pathname: '/manage/session/create',
                    params: { classId: classData.id, className: classData.name, sessionId: item.id },
                  })}
                  grow
                />
                <Button
                  variant="dangerOutline"
                  label="Hapus Sesi"
                  disabled={busy}
                  onPress={async () => {
                    setActionError('');
                    const result = await deleteSession(item.id);
                    if (!result.success) setActionError(result.error ?? 'Sesi gagal dihapus.');
                  }}
                  grow
                />
              </ActionRow>
            )}
          </Panel>
        )}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: space.xl, width: '100%', maxWidth: layout.form, alignSelf: 'center' },
  emptyAction: { marginTop: space.md, alignSelf: 'stretch' },
  content: { padding: space.lg, paddingBottom: space.huge, width: '100%', maxWidth: 880, alignSelf: 'center' },
  contentCompact: { paddingHorizontal: space.md },
  contentWide: { paddingHorizontal: space.xxl, paddingTop: space.xxl },
  sectionHeader: { gap: space.xl, marginBottom: space.lg },
  classId: { ...type.mono, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  sessionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: space.md,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  headerCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, gap: space.xxs },
  sectionTitle: { ...type.heading, color: colors.text },
  sectionSubtitle: { ...type.body, color: colors.textSecondary },
  addButton: { flexGrow: 1, flexBasis: 160, maxWidth: 260 },
  separator: { height: space.md },
  sessionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { ...type.mono, fontSize: 13, lineHeight: 18, color: colors.textSecondary, flexShrink: 1 },
  sessionCourse: { ...type.heading, color: colors.text },
  sessionActions: { marginTop: space.xs },
});
