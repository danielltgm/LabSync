import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ActionRow, Button, Notice, Panel } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { IssueChallengeResult } from '@/server/attendance/qr-challenge';
import { requestAttendanceChallenge } from '@/services/sessionService';
import type { LiveSession } from '@/types/sprint2';

export interface AssistantQrModalProps {
  visible: boolean;
  session: LiveSession | null;
  onClose: () => void;
  onCloseSession?: (sessionId: string) => void;
}

export function AssistantQrModal({
  visible,
  session,
  onClose,
  onCloseSession,
}: AssistantQrModalProps) {
  const [challenge, setChallenge] = useState<IssueChallengeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [error, setError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const sessionId = session?.id;

  async function handleManualRotate() {
    if (!sessionId || isRotating) return;
    setIsRotating(true);
    setLoading(true);
    setError('');

    try {
      const res = await requestAttendanceChallenge(sessionId);
      if (res.success && res.data) {
        setChallenge(res.data);
        const expiresAtMs = new Date(res.data.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
        setSecondsRemaining(diff || res.data.ttlSeconds);
      } else {
        setError(res.error ?? 'Gagal memuat QR presensi.');
      }
    } finally {
      setIsRotating(false);
      setLoading(false);
    }
  }

  // Muat challenge pertama kali saat modal dibuka
  useEffect(() => {
    if (!visible || !sessionId) return;

    let active = true;
    requestAttendanceChallenge(sessionId)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setChallenge(res.data);
          const expiresAtMs = new Date(res.data.expiresAt).getTime();
          const diff = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
          setSecondsRemaining(diff || res.data.ttlSeconds);
        } else {
          setError(res.error ?? 'Gagal memuat QR presensi.');
        }
      })
      .catch((err) => {
        if (!active) return;
        setError((err as Error)?.message ?? 'Gagal memuat QR presensi.');
      });

    return () => {
      active = false;
      setChallenge(null);
      setError('');
    };
  }, [visible, sessionId]);

  // Timer countdown dan auto-rotasi
  useEffect(() => {
    if (!visible || !challenge || !sessionId) return;

    const interval = setInterval(() => {
      const expiresAtMs = new Date(challenge.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      // Auto rotasi saat sisa waktu <= 3 detik
      if (remaining <= 3 && !isRotating) {
        setIsRotating(true);
        requestAttendanceChallenge(sessionId)
          .then((res) => {
            if (res.success && res.data) {
              setChallenge(res.data);
              const newExpiresAtMs = new Date(res.data.expiresAt).getTime();
              const newDiff = Math.max(0, Math.floor((newExpiresAtMs - Date.now()) / 1000));
              setSecondsRemaining(newDiff || res.data.ttlSeconds);
            }
          })
          .finally(() => {
            setIsRotating(false);
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, challenge, sessionId, isRotating]);

  if (!visible || !session) return null;

  const qrJsonString = challenge?.qr ? JSON.stringify(challenge.qr) : '';
  const progressRatio = challenge ? Math.min(1, Math.max(0, secondsRemaining / challenge.ttlSeconds)) : 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Panel style={styles.card}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>QR Presensi Sesi Aktif</Text>
              <Text style={styles.subtitle}>
                {session.courseName} · {session.className}
              </Text>
            </View>

            {(loading || !challenge) && !error ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingText}>Meminta QR presensi dari server...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Notice tone="danger" message={error} alert />
                <Button
                  label="Coba Lagi"
                  variant="primary"
                  onPress={() => handleManualRotate()}
                  style={styles.retryButton}
                />
              </View>
            ) : challenge ? (
              <View style={styles.qrContainer}>
                {/* Visual Container QR Code */}
                <View style={styles.qrVisualFrame}>
                  <View style={styles.qrHeader}>
                    <Text style={styles.qrVersionBadge}>LABSYNC QR v{challenge.qr.version}</Text>
                    <Text style={styles.qrTimerBadge}>
                      Rotasi dalam {secondsRemaining}s
                    </Text>
                  </View>

                  {/* Progress bar countdown TTL */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${progressRatio * 100}%`,
                          backgroundColor:
                            secondsRemaining <= 10
                              ? colors.danger.solid
                              : colors.success.solid,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.qrDataBlock}>
                    <View style={styles.qrImageWrapper}>
                      <QRCode
                        value={qrJsonString}
                        size={220}
                        backgroundColor={colors.surface}
                        color={colors.text}
                        quietZone={8}
                      />
                    </View>
                  </View>

                  <View style={styles.metaBox}>
                    <Text style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Challenge ID: </Text>
                      {challenge.qr.challengeId.slice(0, 18)}...
                    </Text>
                    <Text style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Token Hash: </Text>
                      Tersimpan aman (SHA-256)
                    </Text>
                  </View>
                </View>

                <Text style={styles.hint}>
                  Arahkan kamera praktikan untuk memindai kode ini. QR akan ter-rotasi otomatis setiap {challenge.ttlSeconds} detik.
                </Text>

                <ActionRow style={styles.actions}>
                  <Button
                    label="Rotasi QR Sekarang"
                    variant="quiet"
                    disabled={isRotating}
                    onPress={() => handleManualRotate()}
                    grow
                  />
                  {onCloseSession && (
                    <Button
                      label="Tutup Sesi"
                      variant="dangerOutline"
                      onPress={() => {
                        onClose();
                        onCloseSession(session.id);
                      }}
                      grow
                    />
                  )}
                </ActionRow>
              </View>
            ) : null}

            <Button
              label="Tutup Tampilan"
              variant="quiet"
              onPress={onClose}
              style={styles.closeButton}
            />
          </ScrollView>
        </Panel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  scrollContent: {
    gap: space.md,
  },
  header: {
    gap: space.xxs,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    paddingBottom: space.sm,
  },
  title: {
    ...type.heading,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  loadingBox: {
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
  },
  loadingText: {
    ...type.body,
    color: colors.textSecondary,
  },
  errorBox: {
    gap: space.md,
    paddingVertical: space.md,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  qrContainer: {
    gap: space.md,
    alignItems: 'stretch',
  },
  qrVisualFrame: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.rule,
    gap: space.sm,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrVersionBadge: {
    ...type.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  qrTimerBadge: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.neutral.background,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radii.sm,
  },
  qrDataBlock: {
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center' as const,
  },
  qrImageWrapper: {
    padding: space.sm,
  },
  metaBox: {
    gap: space.xxs,
    paddingTop: space.xxs,
  },
  metaItem: {
    ...type.caption,
    color: colors.textMuted,
  },
  metaLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  hint: {
    ...type.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    marginTop: space.xs,
  },
  closeButton: {
    marginTop: space.xs,
  },
});
