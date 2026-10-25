import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { Session } from '@/types/session';

export interface SessionPraktikanCardProps {
  session: Session;
  isAttended: boolean;
  onPressAttendance: (session: Session) => void;
}

export function SessionPraktikanCard({
  session,
  isAttended,
  onPressAttendance,
}: SessionPraktikanCardProps) {
  const canAttend = session.status === 'DIBUKA' && !isAttended;

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
        label: 'Lakukan Presensi',
        buttonStyle: styles.buttonActive,
        textStyle: styles.buttonTextActive,
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

      <Pressable
        disabled={!canAttend}
        onPress={() => onPressAttendance(session)}
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
});

export default SessionPraktikanCard;
