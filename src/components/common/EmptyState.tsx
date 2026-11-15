import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LabSyncColors, LabSyncRadii, LabSyncSpacing, LabSyncTypography } from '@/constants/labsync-theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({ title, description, icon, children }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        {icon ?? (
          <View style={styles.sheet}>
            <View style={[styles.line, styles.lineShort]} />
            <View style={styles.line} />
            <View style={styles.line} />
          </View>
        )}
      </View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: LabSyncSpacing.xxxl,
    paddingHorizontal: LabSyncSpacing.xl,
    gap: LabSyncSpacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: LabSyncColors.borderSoft,
    borderRadius: LabSyncRadii.lg,
  },
  icon: { marginBottom: LabSyncSpacing.sm },
  sheet: {
    width: 34,
    height: 42,
    borderWidth: 1.5,
    borderColor: LabSyncColors.neutral.solid,
    borderRadius: LabSyncRadii.sm,
    paddingHorizontal: 7,
    paddingVertical: 9,
    justifyContent: 'space-between',
    backgroundColor: LabSyncColors.surface,
  },
  line: { height: 1.5, backgroundColor: LabSyncColors.neutral.solid },
  lineShort: { width: '60%' },
  title: { ...LabSyncTypography.heading, fontSize: 19, lineHeight: 25, color: LabSyncColors.text, textAlign: 'center', maxWidth: 420 },
  description: { ...LabSyncTypography.body, color: LabSyncColors.textSecondary, textAlign: 'center', maxWidth: 420 },
});
