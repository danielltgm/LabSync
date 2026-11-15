import { router } from 'expo-router';
import { useState } from 'react';
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
import { ClassForm } from '@/components/manage/ClassForm';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { useClasses } from '@/hooks/useClasses';

export default function ManageClassesScreen() {
  const { activeUser } = useLabSync();
  const { classes, loading, error, createClass, updateClass, deleteClass } = useClasses(activeUser?.id);

  const [formVisible, setFormVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<{ id: string; name: string } | null>(null);

  if (activeUser?.role !== 'ASISTEN') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.restricted}>
          <Text style={styles.title}>Akses Ditolak</Text>
          <Text style={styles.subtitle}>Halaman manajemen hanya dapat diakses oleh Asisten Laboratorium.</Text>
          <Button title="Kembali ke Beranda" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>Manajemen Kelas</Text>
          <Text style={styles.subtitle}>Kelola daftar kelas dan sesi praktikum yang Anda ampu.</Text>
        </View>
        <Button title="Kembali" onPress={() => router.replace('/')} color={colors.textSecondary} />
      </View>

      <View style={styles.actionRow}>
        <Button
          title="+ Tambah Kelas Baru"
          onPress={() => {
            setEditingClass(null);
            setFormVisible(true);
          }}
        />
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Belum Ada Kelas"
              description="Anda belum memiliki kelas praktikum. Silakan buat kelas baru."
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.classCard}>
            <View style={styles.classInfo}>
              <Text style={styles.className}>{item.name}</Text>
              <Text style={styles.classMeta}>ID: {item.id}</Text>
            </View>

            <View style={styles.buttonGroup}>
              <Pressable
                style={styles.detailButton}
                onPress={() => router.push(`/manage/class/${item.id}`)}
              >
                <Text style={styles.detailButtonText}>Kelola Sesi & Praktikan</Text>
              </Pressable>

              <Pressable
                style={styles.editButton}
                onPress={() => {
                  setEditingClass(item);
                  setFormVisible(true);
                }}
              >
                <Text style={styles.editButtonText}>Ubah</Text>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  void deleteClass(item.id);
                }}
              >
                <Text style={styles.deleteButtonText}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <ClassForm
        visible={formVisible}
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  restricted: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md },
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
  actionRow: { padding: space.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderDark },
  loader: { marginVertical: space.xl },
  errorText: { ...type.caption, color: colors.danger.text, margin: space.lg },
  list: { padding: space.lg, gap: space.md },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.lg,
    borderColor: colors.borderDark,
    borderWidth: 1,
    gap: space.md,
  },
  classInfo: { gap: space.xs },
  className: { ...type.heading, color: colors.text },
  classMeta: { ...type.caption, color: colors.textSecondary },
  buttonGroup: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  detailButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
  },
  detailButtonText: { ...type.button, color: colors.surface },
  editButton: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
  },
  editButtonText: { ...type.button, color: colors.text },
  deleteButton: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
  },
  deleteButtonText: { ...type.button, color: colors.danger.text },
});
