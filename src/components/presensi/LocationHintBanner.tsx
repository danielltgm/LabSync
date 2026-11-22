import { StyleSheet, Text } from 'react-native';

import { MetaList, MetaRow, Notice, Panel, type Tone } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { ClientRadiusHint } from '@/services/attendance/radius-hint';

const hintTone: Record<ClientRadiusHint['kind'], Tone> = {
  'lab-unconfigured': 'warning',
  'waiting-location': 'info',
  'inside-radius': 'success',
  'outside-radius': 'danger',
};

export function LocationHintBanner({ hint }: { hint: ClientRadiusHint }) {
  return (
    <Panel style={styles.panel}>
      <Text style={styles.title}>Bantuan Pemeriksaan Radius (Perkiraan)</Text>
      <Notice tone={hintTone[hint.kind]} message={hint.message} />
      {hint.kind === 'inside-radius' || hint.kind === 'outside-radius' ? (
        <MetaList>
          <MetaRow label="Target Lab" value={hint.labName} />
          <MetaRow label="Radius Sesi" value={`${hint.radiusMeters} meter`} mono />
          <MetaRow label="Perkiraan Jarak" value={`±${hint.estimatedDistanceMeters} meter`} mono />
        </MetaList>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  title: { ...type.heading, fontSize: 16, lineHeight: 22, color: colors.text },
});
