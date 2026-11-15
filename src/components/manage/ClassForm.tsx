import { useState } from 'react';

import { ActionRow, Button, DialogFrame, DialogTitle, Notice, TextField } from '@/components/common/ui';

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
    <DialogFrame visible={visible} onRequestClose={onClose} dismissKeyboard>
      <DialogTitle>{isEditing ? 'Ubah Nama Kelas' : 'Tambah Kelas Baru'}</DialogTitle>

      <TextField
        label="Nama kelas"
        placeholder="Contoh: IF-3A Praktikum Mobile"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError('');
        }}
        editable={!busy}
        invalid={!!error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => { if (!busy && name.trim()) void handleSubmit(); }}
      />

      {!!error && <Notice tone="danger" message={error} alert />}

      <ActionRow>
        <Button label="Batal" onPress={onClose} disabled={busy} grow />
        <Button
          variant="primary"
          label={busy ? 'Menyimpan…' : isEditing ? 'Simpan' : 'Buat Kelas'}
          onPress={() => { void handleSubmit(); }}
          disabled={busy || !name.trim()}
          grow
        />
      </ActionRow>
    </DialogFrame>
  );
}
