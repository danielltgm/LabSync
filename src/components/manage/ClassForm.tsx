import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';

interface ClassFormProps {
  visible: boolean;
  initialName?: string;
  isEditing?: boolean;
  onSubmit: (name: string) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export function ClassForm({
  visible,
  initialName = '',
  isEditing = false,
  onSubmit,
  onClose,
}: ClassFormProps) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Nama kelas tidak boleh kosong.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const result = await onSubmit(name.trim());
      if (result.success) {
        setName('');
        onClose();
      } else {
        setError(result.error ?? 'Gagal menyimpan kelas.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isEditing ? 'Ubah Nama Kelas' : 'Tambah Kelas Baru'}
          </Text>

          <TextInput
            accessibilityLabel="Nama kelas"
            placeholder="Contoh: IF-3A Praktikum Mobile"
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError('');
            }}
            editable={!busy}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {busy && <ActivityIndicator color={colors.primary} style={styles.loader} />}

          <View style={styles.actions}>
            <Button title="Batal" onPress={onClose} disabled={busy} color={colors.textSecondary} />
            <Button
              title={busy ? 'Menyimpan…' : isEditing ? 'Simpan' : 'Buat Kelas'}
              onPress={() => { void handleSubmit(); }}
              disabled={busy || !name.trim()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.xl,
    gap: space.md,
  },
  title: {
    ...type.heading,
    color: colors.text,
  },
  input: {
    ...type.body,
    color: colors.text,
    borderColor: colors.borderDark,
    borderWidth: 1,
    borderRadius: radii.sm,
    minHeight: 48,
    padding: space.md,
    backgroundColor: colors.background,
  },
  loader: {
    marginVertical: space.xs,
  },
  errorText: {
    ...type.caption,
    color: colors.danger.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.md,
    marginTop: space.sm,
  },
});
