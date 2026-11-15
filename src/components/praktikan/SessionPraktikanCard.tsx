import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { LeaveRequestRecord } from '@/firebase/queries';
import type { Session } from '@/types/session';

export interface SessionPraktikanCardProps {
  session: Session;
  isAttended: boolean;
  onPressAttendance?: (session: Session) => void;
  leaveRequest?: LeaveRequestRecord;
  onPressLeave?: (session: Session) => void;
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

  const getDecisionBadge = (decision: LeaveRequestRecord['decision']) => {
    if (decision === 'approved') {
      return {
        label: 'Status Izin: Disetujui Asisten',
        containerStyle: styles.leaveApproved,
        textStyle: styles.leaveTextApproved,
      };
    }
    if (decision === 'rejected') {
      return {
        label: 'Status Izin: Ditolak Asisten',
        containerStyle: styles.leaveRejected,
        textStyle: styles.leaveTextRejected,
      };
    }
    return {
      label: 'Status Izin: Menunggu Review Asisten',
      containerStyle: styles.leavePending,
      textStyle: styles.leaveTextPending,
    };
  };

  const getClassificationLabel = (classification: LeaveRequestRecord['classification']) => {
    if (classification.status === 'classified') {
      return `Kategori AI: ${classification.category}`;
    }
    if (classification.status === 'unavailable') {
      return 'Kategori AI: Tidak tersedia (review manual)';
    }
    return 'Kategori AI: Sedang diklasifikasi...';
  };

  const getButtonConfig = () => {
    if (isAttended) {
      return {
        label: 'Sudah Presensi',
        buttonStyle: styles.buttonAttended,
        textStyle: styles.buttonTextAttended,
      };
    }
    if (session.status === 'DIBUKA') {
      return {
        label: canAttend ? 'Lakukan Presensi' : 'Presensi belum tersedia',
        buttonStyle: canAttend ? styles.buttonActive : styles.buttonDisabled,
        textStyle: canAttend ? styles.buttonTextActive : styles.buttonTextDisabled,
      };
    }
    if (session.status === 'TERJADWAL') {
      return {
        label: 'Sesi Belum Dibuka',
        buttonStyle: styles.buttonDisabled,
        textStyle: styles.buttonTextDisabled,
      };
    }
    return {
      label: 'Sesi Selesai',
      buttonStyle: styles.buttonDisabled,
      textStyle: styles.buttonTextDisabled,
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.courseName}>{session.courseName}</Text>
        <StatusBadge status={session.status} />
      </View>

      <View style={styles.metaContainer}>
        <Text style={styles.metaText}>🏛️ {session.labRoom}</Text>
        <Text style={styles.metaText}>
          👥 {session.className}  •  ⏰ {session.startTime} - {session.endTime} WIB ({session.date})
        </Text>
        <Text style={styles.metaText}>👤 Asisten: {session.assistantName}</Text>
      </View>

      {leaveRequest ? (
        <View style={[styles.leaveBanner, getDecisionBadge(leaveRequest.decision).containerStyle]}>
          <Text style={[styles.leaveDecisionText, getDecisionBadge(leaveRequest.decision).textStyle]}>
            {getDecisionBadge(leaveRequest.decision).label}
          </Text>
          <Text style={styles.leaveMetaText}>
            {getClassificationLabel(leaveRequest.classification)}
          </Text>
          <Text style={styles.leaveReasonText}>
            Alasan: {leaveRequest.reason}
          </Text>
        </View>
      ) : null}

      <Pressable
        disabled={!canAttend}
        onPress={() => onPressAttendance?.(session)}
        accessibilityRole="button"
        accessibilityLabel={buttonConfig.label}
        accessibilityState={{ disabled: !canAttend }}
        style={({ pressed }) => [
          styles.buttonBase,
          buttonConfig.buttonStyle,
          canAttend && pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonTextBase, buttonConfig.textStyle]}>
          {buttonConfig.label}
        </Text>
      </Pressable>

      {canRequestLeave ? (
        <Pressable
          onPress={() => onPressLeave?.(session)}
          accessibilityRole="button"
          accessibilityLabel="Ajukan Izin"
          style={({ pressed }) => [
            styles.buttonBase,
            styles.buttonLeaveOutline,
            pressed && styles.buttonLeavePressed,
          ]}
        >
          <Text style={[styles.buttonTextBase, styles.buttonTextLeaveOutline]}>
            Ajukan Izin
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  courseName: {
    flexGrow: 1,
    flexBasis: 180,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: '#0F172A',
  },
  metaContainer: {
    marginVertical: 12,
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#475569',
  },
  buttonBase: {
    minHeight: 48,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  buttonPressed: {
    backgroundColor: '#1D4ED8',
    opacity: 0.85,
  },
  buttonAttended: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  buttonDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  buttonTextBase: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  buttonTextActive: {
    color: '#FFFFFF',
  },
  buttonTextAttended: {
    color: '#15803D',
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#94A3B8',
  },
  buttonLeaveOutline: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    marginTop: 8,
  },
  buttonLeavePressed: {
    backgroundColor: '#F8FAFC',
    opacity: 0.85,
  },
  buttonTextLeaveOutline: {
    color: '#334155',
    fontWeight: '600',
  },
  leaveBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  leavePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  leaveApproved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  leaveRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  leaveDecisionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  leaveTextPending: {
    color: '#B45309',
  },
  leaveTextApproved: {
    color: '#15803D',
  },
  leaveTextRejected: {
    color: '#B91C1C',
  },
  leaveMetaText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: '#334155',
  },
  leaveReasonText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: '#475569',
  },
});

export default SessionPraktikanCard;
