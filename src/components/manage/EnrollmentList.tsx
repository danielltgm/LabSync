import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { Button, LoadingLine, Notice, Panel, TextField } from '@/components/common/ui';
import { LabSyncColors as colors, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import { fetchClassParticipants } from '@/firebase/class-participants';
import { useEnrollments } from '@/hooks/useEnrollments';
import type { ClassParticipant, ParticipantPage } from '@/types/class-participants';

function mergeStudents(existing: ClassParticipant[], incoming: ClassParticipant[]) {
  const students = new Map(existing.map((student) => [student.uid, student]));
  for (const student of incoming) students.set(student.uid, student);
  return [...students.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function EnrollmentList({ classId }: { classId: string }) {
  const [directory, setDirectory] = useState<ParticipantPage>();
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean }>();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [paging, setPaging] = useState(false);
  const [removal, setRemoval] = useState<ClassParticipant>();
  const { enroll, unenroll, busy } = useEnrollments(classId);

  useEffect(() => {
    const controller = new AbortController();
    void fetchClassParticipants(classId, { signal: controller.signal }).then((page) => {
      if (!controller.signal.aborted) setDirectory({ ...page, students: mergeStudents([], page.students) });
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError('Daftar peserta gagal dimuat. Cek koneksi lalu coba lagi.');
    });
    return () => controller.abort();
  }, [classId, revision]);

  const students = directory?.students ?? [];
  const enrolled = students.filter((student) => student.enrolled);
  const query = search.trim().toLowerCase();
  const candidates = students.filter((student) =>
    !student.enrolled && (student.name.toLowerCase().includes(query) || student.identifier.toLowerCase().includes(query)));

  async function loadMore(identifier?: string) {
    if (paging) return;
    setPaging(true);
    setActionMessage(undefined);
    try {
      const page = await fetchClassParticipants(classId, identifier ? { identifier } : { cursor: directory?.nextCursor });
      setDirectory((current) => ({
        students: mergeStudents(current?.students ?? [], page.students),
        nextCursor: identifier ? current?.nextCursor : page.nextCursor,
      }));
      if (identifier && (page.students.length === 0 || page.students.every((student) => student.enrolled))) {
        setActionMessage({
          text: page.students.length ? 'Praktikan ini sudah ada di kelas.' : 'NIM belum ditemukan.',
          isError: false,
        });
      }
    } catch {
      setActionMessage({ text: 'Pencarian gagal. Coba lagi.', isError: true });
    } finally {
      setPaging(false);
    }
  }

  async function handleMembership(student: ClassParticipant, remove = false) {
    if (busy) return;
    setRemoval(undefined);
    setActionMessage(undefined);
    const result = await (remove ? unenroll : enroll)(student.uid);
    if (result.success) {
      setDirectory((current) => current && {
        ...current,
        students: current.students.map((row) => row.uid === student.uid ? { ...row, enrolled: !remove } : row),
      });
      setActionMessage({ text: remove ? `${student.name} dikeluarkan dari kelas.` : `${student.name} ditambahkan.`, isError: false });
    } else {
      setActionMessage({ text: 'Perubahan peserta gagal disimpan. Coba lagi.', isError: true });
    }
  }

  return (
    <Panel>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={styles.title}>Peserta kelas</Text>
        {directory && (
          <Button compact variant={adding ? 'secondary' : 'primary'} label={adding ? 'Tutup daftar' : 'Tambah peserta'}
            onPress={() => { setAdding(!adding); setSearch(''); setActionMessage(undefined); }} />
        )}
      </View>

      {loadError ? (
        <Notice tone="danger" message={loadError} alert>
          <Button compact label="Coba lagi" onPress={() => { setLoadError(''); setRevision((value) => value + 1); }} />
        </Notice>
      ) : !directory ? <LoadingLine label="Memuat peserta…" /> : (
        <>
          {enrolled.length === 0 && (
            <Text style={styles.body}>{directory.nextCursor ? 'Belum ada peserta di halaman ini.' : 'Belum ada peserta di kelas ini.'}</Text>
          )}
          {enrolled.map((student) => (
            <View key={student.uid} style={styles.row}>
              <StudentIdentity student={student} />
              <Button compact variant="dangerOutline" label="Keluarkan" accessibilityLabel={`Keluarkan ${student.name}`}
                disabled={busy || paging} onPress={() => setRemoval(student)} />
            </View>
          ))}

          {adding && (
            <View style={styles.directory}>
              <TextField label="Cari nama atau NIM" value={search} onChangeText={setSearch}
                autoCorrect={false} maxLength={100} />
              {candidates.length === 0 && <Text style={styles.body}>Tidak ada praktikan yang cocok di daftar ini.</Text>}
              {candidates.map((student) => (
                <View key={student.uid} style={styles.row}>
                  <StudentIdentity student={student} />
                  <Button compact label="Tambah" accessibilityLabel={`Tambah ${student.name}`}
                    onPress={() => { void handleMembership(student); }} disabled={busy || paging} />
                </View>
              ))}
              {query.length > 0 && search.trim().length <= 40 && (
                <Button compact variant="quiet" label="Cari NIM persis" disabled={paging || busy}
                  onPress={() => { void loadMore(search.trim()); }} />
              )}
            </View>
          )}

          {directory.nextCursor && (
            <Button compact label={paging ? 'Memuat…' : 'Muat peserta lain'} disabled={paging || busy} onPress={() => { void loadMore(); }} />
          )}
        </>
      )}

      {actionMessage && (
        <Notice tone={actionMessage.isError ? 'danger' : 'neutral'} message={actionMessage.text}
          alert={actionMessage.isError} live={!actionMessage.isError} />
      )}
      <ConfirmationModal visible={!!removal} title="Keluarkan peserta?"
        message={removal ? `${removal.name} akan dikeluarkan dari kelas ini.` : ''}
        confirmLabel="Ya, keluarkan" variant="danger" onCancel={() => setRemoval(undefined)}
        onConfirm={() => { if (removal) void handleMembership(removal, true); }} />
    </Panel>
  );
}

function StudentIdentity({ student }: { student: ClassParticipant }) {
  return (
    <View style={styles.identity}>
      <Text style={styles.name}>{student.name}</Text>
      {!!student.identifier && <Text style={styles.identifier}>{student.identifier}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.heading, color: colors.text, flexShrink: 1 },
  body: { ...type.body, color: colors.textSecondary },
  directory: { borderTopWidth: 1, borderColor: colors.rule, paddingTop: space.md, gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, paddingVertical: space.sm,
    borderBottomWidth: 1, borderColor: colors.rule },
  identity: { flexGrow: 1, flexShrink: 1, flexBasis: 130, minWidth: 0, gap: space.xxs },
  name: { ...type.bodyStrong, color: colors.text },
  identifier: { ...type.mono, color: colors.textMuted },
});
