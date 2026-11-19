import { StyleSheet, Text } from 'react-native';

import { Button, Notice, Panel } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type {
  CheckInFeedbackView,
  RecoveryAction,
} from '@/services/attendance/check-in-feedback';

export interface CheckInFeedbackCardProps {
  feedback: CheckInFeedbackView;
  onRecovery: (action: RecoveryAction) => void;
}

export function CheckInFeedbackCard({ feedback, onRecovery }: CheckInFeedbackCardProps) {
  const accent =
    feedback.tone === 'success'
      ? colors.success.solid
      : feedback.tone === 'danger'
        ? colors.danger.solid
        : feedback.tone === 'warning'
          ? colors.warning.solid
          : colors.primary;

  return (
    <Panel accent={accent} style={styles.panel}>
      <Text style={styles.title}>{feedback.title}</Text>
      <Notice tone={feedback.tone} message={feedback.message} alert={feedback.tone === 'danger'} />
      {feedback.recoveryAction !== 'none' && feedback.recoveryLabel ? (
        <Button
          variant={feedback.tone === 'danger' ? 'dangerOutline' : 'primary'}
          label={feedback.recoveryLabel}
          onPress={() => onRecovery(feedback.recoveryAction)}
        />
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  title: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
});
