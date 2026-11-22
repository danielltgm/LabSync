import { useLocalSearchParams } from 'expo-router';
import { CalendarX } from 'lucide-react-native';
import { useState } from 'react';

import { useConfirm } from '@/components/app/confirm';
import { EmptyState } from '@/components/app/primitives';
import { PageHeader, Screen, goBack } from '@/components/app/screen';
import { SessionForm, type SessionFormValue } from '@/components/app/session-form';
import { viewSession } from '@/data/selectors';
import { useStore } from '@/data/store';
import { formatDate, formatTimeRange, fromDateTimeInput, MINUTE, toDateInput, toTimeInput } from '@/lib/format';

export default function EditSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateSession, toast } = useStore();
  const raw = state.sessions.find((s) => s.id === id);
  const { confirm, dialog } = useConfirm();
  const [value, setValue] = useState<SessionFormValue | null>(() =>
    raw
      ? {
          classId: raw.classId,
          topic: raw.topic,
          description: raw.description,
          date: toDateInput(raw.startsAt),
          time: toTimeInput(raw.startsAt),
          durationMin: Math.round((raw.endsAt - raw.startsAt) / MINUTE),
          labId: raw.labId,
          lateAfterMin: raw.lateAfterMin,
          repeatWeeks: 1,
          changeNote: '',
          materials: raw.materials,
        }
      : null,
  );

  if (!raw || !value) {
    return (
      <Screen header={<PageHeader title="Ubah pertemuan" />}>
        <EmptyState icon={CalendarX} title="Sesi tidak ditemukan" />
      </Screen>
    );
  }
  const s = viewSession(state, raw);
  const newStart = fromDateTimeInput(value.date, value.time);
  const scheduleChanged = newStart !== s.startsAt || newStart + value.durationMin * MINUTE !== s.endsAt || value.labId !== s.labId;

  return (
    <Screen header={<PageHeader title="Ubah pertemuan" subtitle={`${s.course.name} · P${s.meetingNo}`} />}>
      <SessionForm
        mode="edit"
        value={value}
        onChange={setValue}
        classes={state.classes}
        courses={state.courses}
        labs={state.labs}
        scheduleChanged={scheduleChanged}
        contentOnly={raw.status !== 'TERJADWAL'}
        submitLabel={scheduleChanged ? 'Simpan dan beri tahu praktikan' : 'Simpan perubahan'}
        onSubmit={() => {
          const startsAt = fromDateTimeInput(value.date, value.time);
          const endsAt = startsAt + value.durationMin * MINUTE;
          const when = (a: number, b: number) => `${formatDate(a, { weekday: true, short: true })}, ${formatTimeRange(a, b)}`;
          const changes = [
            ...(startsAt !== s.startsAt || endsAt !== s.endsAt ? [{ label: 'Waktu', from: when(s.startsAt, s.endsAt), to: when(startsAt, endsAt) }] : []),
            ...(value.labId !== s.labId ? [{ label: 'Lab', from: s.lab.name, to: state.labs.find((l) => l.id === value.labId)?.name ?? '-' }] : []),
            ...(value.lateAfterMin !== s.lateAfterMin ? [{ label: 'Terlambat setelah', from: `${s.lateAfterMin} mnt`, to: `${value.lateAfterMin} mnt` }] : []),
            ...(value.topic.trim() !== s.topic ? [{ label: 'Topik', from: s.topic, to: value.topic.trim() }] : []),
            ...(value.description.trim() !== s.description ? [{ label: 'Keterangan', to: 'diubah' }] : []),
            ...(JSON.stringify(value.materials) !== JSON.stringify(s.materials)
              ? [{ label: 'Materi', from: `${s.materials.length} tautan`, to: `${value.materials.length} tautan` }]
              : []),
          ];
          if (!changes.length) {
            toast({ title: 'Tidak ada yang berubah' });
            return;
          }
          confirm({
            title: scheduleChanged ? 'Simpan perubahan jadwal?' : 'Simpan perubahan pertemuan?',
            body: scheduleChanged
              ? `Semua ${s.cls.studentNims.length} praktikan ${s.cls.label} langsung dapat notifikasi.`
              : 'Praktikan melihat isi terbaru di halaman pertemuan. Perubahan tercatat di log kelas.',
            confirmLabel: scheduleChanged ? 'Simpan & kirim' : 'Simpan',
            changes,
            onConfirm: () => {
              const n = updateSession(
                s.id,
                {
                  startsAt,
                  endsAt,
                  labId: value.labId,
                  lateAfterMin: value.lateAfterMin,
                  topic: value.topic.trim(),
                  description: value.description.trim(),
                  materials: value.materials,
                },
                value.changeNote.trim(),
              );
              toast({ title: 'Pertemuan diperbarui', body: n ? `Notifikasi terkirim ke ${n} praktikan.` : undefined, tone: 'success' });
              goBack();
            },
          });
        }}
      />
      {dialog}
    </Screen>
  );
}
