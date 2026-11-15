import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SessionSheet } from '@/components/common/SessionSheet';
import { Button, type ButtonVariant, type Tone, toneText } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { LiveLeaveRequest } from '@/types/leave-request';
import type { Session } from '@/types/session';

export interface SessionPraktikanCardProps {
  session: Session;
  isAttended: boolean;
  onPressAttendance?: (session: Session) => void;
  leaveRequest?: LiveLeaveRequest;
  onPressLeave?: (session: Session) => void;
}

const decisionBadge: Record<LiveLeaveRequest['decision'], { label: string; tone: Tone }> = {
  approved: { label: 'Status Izin: Disetujui Asisten', tone: 'success' },
  rejected: { label: 'Status Izin: Ditolak Asisten', tone: 'danger' },
  pending: { label: 'Status Izin: Menunggu Review Asisten', tone: 'warning' },
};

function classificationLabel(classification: LiveLeaveRequest['classification']) {
  if (classification.status === 'classified') {
    return `Kategori AI: ${classification.category}`;
  }
  if (classification.status === 'unavailable') {
    return 'Kategori AI: Tidak tersedia (review manual)';
  }
  return 'Kategori AI: Sedang diklasifikasi...';
}

export function SessionPraktikanCard({
  session,
  isAttended,
  onPressAttendance,
  leaveRequest,
  onPressLeave,
}: SessionPraktikanCardProps) {
  const canAttend = session.status === 'DIBUKA' && !isAttended && !leaveRequest && !!onPressAttendance;
  const canRequestLeave = !isAttended && !leaveRequest && session.status !== 'SELESAI' && !!onPressLeave;

  const getButtonConfig = (): { label: string; variant: ButtonVariant } => {
    if (isAttended) return { label: 'Sudah Presensi', variant: 'success' };
    if (session.status === 'DIBUKA') {
      return canAttend
        ? { label: 'Lakukan Presensi', variant: 'primary' }
        : { label: 'Presensi belum tersedia', variant: 'muted' };
    }
    if (session.status === 'TERJADWAL') return { label: 'Sesi Belum Dibuka', variant: 'muted' };
    return { label: 'Sesi Selesai', variant: 'muted' };
  };

  const buttonConfig = getButtonConfig();
  const badge = leaveRequest ? decisionBadge[leaveRequest.decision] : null;

  return (
    <SessionSheet session={session}>
      {leaveRequest && badge ? (
        <View style={[styles.leave, leaveSurface[badge.tone]]}>
          <Text style={[styles.leaveDecision, { color: toneText[badge.tone] }]}>{badge.label}</Text>
          <Text style={styles.leaveMeta}>{classificationLabel(leaveRequest.classification)}</Text>
          <Text numberOfLines={3} style={styles.leaveReason}>Alasan: {leaveRequest.reason}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={buttonConfig.label}
          accessibilityLabel={buttonConfig.label}
          variant={buttonConfig.variant}
          glyph={isAttended ? '✓' : undefined}
          disabled={!canAttend}
          onPress={() => onPressAttendance?.(session)}
        />
        {canRequestLeave ? (
          <Button label="Ajukan Izin" accessibilityLabel="Ajukan Izin" onPress={() => onPressLeave?.(session)} />
        ) : null}
      </View>
    </SessionSheet>
  );
}

const leaveSurface = StyleSheet.create({
  info: { backgroundColor: colors.primarySurface, borderLeftColor: colors.primary },
  success: { backgroundColor: colors.success.background, borderLeftColor: colors.success.solid },
  danger: { backgroundColor: colors.danger.background, borderLeftColor: colors.danger.solid },
  warning: { backgroundColor: colors.warning.background, borderLeftColor: colors.warning.solid },
  neutral: { backgroundColor: colors.neutral.background, borderLeftColor: colors.neutral.solid },
});

const styles = StyleSheet.create({
  leave: {
    borderLeftWidth: 3,
    borderRadius: radii.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    gap: space.xs,
  },
  leaveDecision: { ...type.label, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  leaveMeta: { ...type.caption, color: colors.text },
  leaveReason: { ...type.caption, fontWeight: '400', color: colors.textSecondary },
  actions: { gap: space.sm },
});

export default SessionPraktikanCard;
