import { StyleSheet, Text, View } from 'react-native';

import { MetaList, MetaRow, Notice, Panel } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { PresensiAvailability } from '@/services/attendance/session-guard';

export function AttendanceStatusCard({ availability }: { availability: PresensiAvailability }) {
  if (availability.kind === 'already-attended') {
    const { record } = availability;
    return (
      <Panel accent={colors.success.solid} style={styles.card}>
        <Text style={styles.title}>Sudah Presensi</Text>
        <Notice tone="success" message={availability.message} />
        <MetaList>
          <MetaRow label="Jam Tercatat" value={`${record.checkInTime} WIB`} mono />
          <MetaRow label="Mahasiswa" value={`${record.studentName} (${record.studentId})`} />
          {record.notes ? <MetaRow label="Catatan / PC" value={record.notes} mono /> : null}
        </MetaList>
      </Panel>
    );
  }

  if (availability.kind === 'open') {
    return (
      <View style={styles.banner}>
        <Notice tone="info" message={availability.message} />
      </View>
    );
  }

  return (
    <Panel style={styles.card}>
      <Text style={styles.title}>
        {availability.kind === 'closed' ? 'Sesi Ditutup' : 'Sesi Belum Dibuka'}
      </Text>
      <Notice tone={availability.kind === 'closed' ? 'danger' : 'warning'} message={availability.message} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  banner: { width: '100%' },
  title: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
});
