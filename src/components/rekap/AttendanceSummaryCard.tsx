import { StyleSheet, Text, View } from 'react-native';

import { LabSyncColors, LabSyncRadii, LabSyncSpacing, LabSyncTypography } from '@/constants/labsync-theme';

export interface AttendanceSummaryCardProps {
  total: number;
}

export function AttendanceSummaryCard({ total }: AttendanceSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total Hadir</Text>
      <View accessible accessibilityLabel={`Total Hadir: ${total} Praktikan`} style={styles.figure}>
        <Text style={styles.total}>{total}</Text>
        <Text style={styles.unit}>Praktikan</Text>
      </View>
      <Text style={styles.description}>Tercatat pada sesi ini</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: LabSyncSpacing.xl,
    gap: LabSyncSpacing.xs,
    backgroundColor: LabSyncColors.primarySurface,
    borderWidth: 1,
    borderColor: LabSyncColors.primaryBorder,
    borderRadius: LabSyncRadii.lg,
  },
  label: { ...LabSyncTypography.eyebrow, color: LabSyncColors.primaryPressed },
  figure: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: LabSyncSpacing.sm },
  total: { ...LabSyncTypography.numeral, color: LabSyncColors.primaryPressed },
  unit: { ...LabSyncTypography.section, color: LabSyncColors.text },
  description: { ...LabSyncTypography.caption, color: LabSyncColors.textSecondary },
});
