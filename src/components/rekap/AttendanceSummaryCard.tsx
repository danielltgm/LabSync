import { StyleSheet, Text, View } from 'react-native';

import { LabSyncColors, LabSyncRadii, LabSyncSpacing, LabSyncTypography } from '@/constants/labsync-theme';

export interface AttendanceSummaryCardProps {
  total: number;
}

export function AttendanceSummaryCard({ total }: AttendanceSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total Hadir</Text>
      <Text accessibilityLabel={`Total Hadir: ${total} Praktikan`} style={styles.total}>
        {total} <Text style={styles.unit}>Praktikan</Text>
      </Text>
      <Text style={styles.description}>Tercatat pada sesi ini</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: LabSyncSpacing.xl, gap: LabSyncSpacing.xs, backgroundColor: LabSyncColors.primarySurface, borderWidth: 1, borderColor: LabSyncColors.neutral.border, borderRadius: LabSyncRadii.lg },
  label: { ...LabSyncTypography.button, color: LabSyncColors.textSecondary },
  total: { ...LabSyncTypography.title, color: LabSyncColors.primary },
  unit: { ...LabSyncTypography.section },
  description: { ...LabSyncTypography.caption, color: LabSyncColors.textSecondary },
});
