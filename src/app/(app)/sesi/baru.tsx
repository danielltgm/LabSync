import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PageHeader, Screen, goBack } from '@/components/app/screen';
import { SessionForm, sessionFormDefaults } from '@/components/app/session-form';
import { SessionShareSheet } from '@/components/app/share-buttons';
import { useMe, useMyClasses, useStore } from '@/data/store';
import { fromDateTimeInput } from '@/lib/format';

export default function NewSession() {
  const params = useLocalSearchParams<{ kelas?: string }>();
  const { state, createSessions, toast } = useStore();
  useMe();
  const classes = useMyClasses();
  const [value, setValue] = useState(() => sessionFormDefaults(classes.find((c) => c.id === params.kelas) ?? classes[0]));
  // Right after creating, offer to share the (first) new meeting with the class.
  const [created, setCreated] = useState<string | null>(null);

  return (
    <Screen header={<PageHeader title="Pertemuan baru" subtitle="Topik, materi, dan jadwal" />}>
      <SessionForm
        mode="create"
        value={value}
        onChange={setValue}
        classes={classes}
        courses={state.courses}
        labs={state.labs}
        submitLabel={value.repeatWeeks > 1 ? `Buat ${value.repeatWeeks} pertemuan` : 'Buat pertemuan'}
        onSubmit={async () => {
          const ids = await createSessions({
            classId: value.classId,
            topic: value.topic.trim(),
            description: value.description.trim() || 'Belum ada keterangan.',
            startsAt: fromDateTimeInput(value.date, value.time),
            durationMin: value.durationMin,
            labId: value.labId,
            repeatWeeks: value.repeatWeeks,
            materials: value.materials,
          });
          toast({ title: `${ids.length} pertemuan dibuat`, body: 'Sesi berstatus terjadwal. Buka sesi saat praktikum dimulai.', tone: 'success' });
          setCreated(ids[0]);
        }}
      />
      {created && (
        <SessionShareSheet
          sessionId={created}
          open
          title="Pertemuan dibuat. Bagikan ke kelas?"
          onOpenChange={(o) => {
            if (!o) {
              setCreated(null);
              goBack();
            }
          }}
        />
      )}
    </Screen>
  );
}
