import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionRow, Button, LoadingLine, Notice, PageHeader } from '@/components/common/ui';
import { ClassForm } from '@/components/manage/ClassForm';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { useClasses } from '@/hooks/useClasses';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function ManageClassesScreen() {
  const { activeUser } = useLabSync();
  const { classes, loading, error, createClass, updateClass, deleteClass } = useClasses(activeUser?.id);
  const { compact, wide } = useResponsiveLayout();

  const [formVisible, setFormVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<{ id: string; name: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string }>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const displayError = deleteError || error;

  async function confirmDelete() {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const result = await deleteClass(deleteTarget.id);
      if (!result.success) setDeleteError(result.error ?? 'Kelas gagal dihapus.');
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(undefined);
    }
  }

  if (activeUser?.role !== 'ASISTEN') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.restricted}>
          <EmptyState
            title="Akses Ditolak"
            description="Halaman manajemen hanya dapat diakses oleh Asisten Laboratorium."
          >
            <Button variant="primary" label="Kembali ke Beranda" onPress={() => router.replace('/')} style={styles.restrictedAction} />
          </EmptyState>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, compact && styles.listCompact, wide && styles.listWide]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <PageHeader
              title="Manajemen Kelas"
              onBack={() => router.replace('/')}
            />

            <ActionRow>
              <Button
                variant="primary"
                label="+ Tambah Kelas Baru"
                compact
                onPress={() => {
                  setEditingClass(null);
                  setFormVisible(true);
                }}
                style={styles.addButton}
              />
            </ActionRow>

            {loading && <LoadingLine label="Memuat data..." />}
            {displayError && <Notice tone="danger" message={displayError} alert />}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Belum Ada Kelas"
              description="Anda belum memiliki kelas praktikum. Silakan buat kelas baru."
            />
          ) : undefined
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <View style={styles.classRow}>
            <Pressable accessibilityRole="button"
              accessibilityLabel={`Kelola kelas ${item.name}`}
              onPress={() => router.push(`/manage/class/${item.id}`)}
              style={({ pressed }) => [styles.openClass, pressed && styles.openPressed]}>
              <Text style={styles.className}>{item.name}</Text>
              <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevron}>›</Text>
            </Pressable>
            <ActionRow style={styles.rowActions}>
              <Button compact variant="quiet" label="Ubah"
                accessibilityLabel={`Ubah kelas ${item.name}`}
                onPress={() => { setEditingClass(item); setFormVisible(true); }} />
              <Button compact variant="dangerOutline" label="Hapus"
                accessibilityLabel={`Hapus kelas ${item.name}`}
                onPress={() => { setDeleteError(''); setDeleteTarget(item); }} />
            </ActionRow>
          </View>
        )}
      />

      <ConfirmationModal visible={!!deleteTarget} title="Hapus kelas?"
        message={deleteTarget ? `Kelas ${deleteTarget.name} akan dihapus.` : ''}
        confirmLabel={deleteBusy ? 'Menghapus…' : 'Ya, hapus'} variant="danger"
        confirmDisabled={deleteBusy} cancelDisabled={deleteBusy}
        onCancel={() => { if (!deleteBusy) setDeleteTarget(undefined); }} onConfirm={() => { void confirmDelete(); }} />

      {formVisible && <ClassForm
        key={editingClass?.id ?? 'new-class'}
        visible
        isEditing={!!editingClass}
        initialName={editingClass?.name ?? ''}
        onClose={() => {
          setFormVisible(false);
          setEditingClass(null);
        }}
        onSubmit={async (name) => {
          if (editingClass) {
            return updateClass(editingClass.id, name);
          }
          return createClass(name);
        }}
      />}
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  restricted: { flex: 1, justifyContent: 'center', padding: space.xl, width: '100%', maxWidth: layout.form, alignSelf: 'center' },
  restrictedAction: { marginTop: space.md, alignSelf: 'stretch' },
  listHeader: { gap: space.xl, paddingBottom: space.xl },
  list: { padding: space.lg, paddingBottom: space.huge, width: '100%', maxWidth: 880, alignSelf: 'center' },
  listCompact: { paddingHorizontal: space.md },
  listWide: { paddingHorizontal: space.xxl, paddingTop: space.xxl },
  addButton: { alignSelf: 'flex-start' },
  separator: { height: space.sm },
  classRow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, borderRadius: 10,
    padding: space.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
  openClass: { minHeight: 48, flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    borderRadius: 6, paddingHorizontal: space.md },
  openPressed: { backgroundColor: colors.primarySurface },
  className: { ...type.bodyStrong, color: colors.text, flexShrink: 1 },
  chevron: { fontSize: 24, lineHeight: 27, color: colors.primary },
  rowActions: { flexShrink: 0, paddingHorizontal: space.xs },
});
