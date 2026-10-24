import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LabSyncColors, LabSyncSpacing, LabSyncTypography } from '@/constants/labsync-theme';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        {icon ?? (
          <View style={styles.document}>
            <View style={styles.line} />
            <View style={styles.line} />
            <View style={styles.line} />
          </View>
        )}
      </View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: LabSyncSpacing.xxl, gap: LabSyncSpacing.sm },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: LabSyncSpacing.sm },
  document: { width: 32, height: 40, borderWidth: 2, borderColor: '#94A3B8', borderRadius: 6, padding: 6, justifyContent: 'space-evenly' },
  line: { height: 2, backgroundColor: '#94A3B8' },
  title: { ...LabSyncTypography.section, color: LabSyncColors.text, textAlign: 'center' },
  description: { ...LabSyncTypography.body, color: LabSyncColors.textSecondary, textAlign: 'center', maxWidth: 420 },
});
