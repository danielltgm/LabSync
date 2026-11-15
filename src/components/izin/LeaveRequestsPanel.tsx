import { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { EmptyState } from '@/components/common/EmptyState';
import { formatSessionDate } from '@/components/common/SessionSheet';
import { ActionRow, Button, LoadingLine, Notice, Panel, type Tone, toneSolid, toneText } from '@/components/common/ui';
import { AttendanceScreenHeader } from '@/components/rekap/AttendanceScreenHeader';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { LeaveDecision, LiveLeaveRequest } from '@/types/leave-request';
import type { Session } from '@/types/session';
import { classificationLabel, formatLeaveDateTime, leaveDecisionLabels, leaveReviewErrorMessage } from '@/utils/leave-request';

interface Props {
  mode: 'assistant' | 'student';
  permitted: boolean;
  requests: readonly LiveLeaveRequest[];
  sessions: readonly Session[];
  session?: Session;
  loading: boolean;
  error?: string;
  onBack: () => void;
  onRetry: () => void;
  onReview?: (id: string, decision: LeaveDecision) => Promise<void>;
}

const decisionTone: Record<LiveLeaveRequest['decision'], Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const decisionGlyph: Record<LiveLeaveRequest['decision'], string> = {
  pending: '◷',
  approved: '✓',
  rejected: '✕',
};

export function LeaveRequestsPanel({ mode, permitted, requests, sessions, session, loading, error, onBack, onRetry, onReview }: Props) {
  const { compact, wide } = useResponsiveLayout();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [selection, setSelection] = useState<{ id: string; decision: LeaveDecision }>();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [writeError, setWriteError] = useState('');
  const locked = useRef(false);
  const isAssistant = mode === 'assistant';
  const accessible = permitted ? requests : [];
  const pending = accessible.filter((item) => item.decision === 'pending');
  const visible = isAssistant && filter === 'pending' ? pending : accessible;
  const selected = accessible.find((item) => item.id === selection?.id && item.decision === 'pending');

  const confirm = async () => {
    if (!selection || !selected || !onReview || !permitted || locked.current) return;
    locked.current = true;
    setSaving(true);
    setFeedback('');
    setWriteError('');
    try {
      await onReview(selection.id, selection.decision);
      setFeedback(selection.decision === 'approved' ? 'Izin berhasil diterima.' : 'Izin berhasil ditolak.');
      setConfirming(false);
    } catch (cause) {
      setWriteError(leaveReviewErrorMessage(cause));
      setConfirming(false);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, compact && styles.compactContent, wide && styles.wideContent]}
        ListHeaderComponent={<View style={styles.header}>
          <AttendanceScreenHeader title={isAssistant ? 'Review Izin' : 'Status Izin Saya'} onBack={onBack} notice={error} onRetry={onRetry} />
          {permitted && <>
            {session && <Panel style={styles.sessionPanel}>
              <Text accessibilityRole="header" style={styles.sessionTitle}>{session.courseName}</Text>
              <Text style={styles.sessionMeta}>Kelas {session.className} · {formatSessionDate(session.date)}</Text>
            </Panel>}
            <Text style={styles.intro}>{isAssistant
              ? 'Baca alasan dan saran kategori AI. Keputusan akhir tetap di tangan asisten.'
              : 'Status keputusan asisten diperbarui secara otomatis.'}</Text>
            <View style={styles.toolbar}>
              {!loading && !error && <Text style={styles.count}>{pending.length} menunggu review · {accessible.length} pengajuan</Text>}
              {isAssistant && <View style={styles.segment}>
                {(['pending', 'all'] as const).map((value) => (
                  <Button
                    key={value}
                    compact
                    variant="quiet"
                    selected={filter === value}
                    label={value === 'pending' ? 'Menunggu review' : 'Semua izin'}
                    onPress={() => setFilter(value)}
                    style={styles.segmentButton}
                  />
                ))}
              </View>}
            </View>
          </>}
          {!!feedback && <Notice tone="success" message={feedback} live />}
          {!!writeError && <Notice tone="danger" message={writeError} alert />}
          {saving && <LoadingLine label="Menyimpan keputusan…" />}
        </View>}
        ListEmptyComponent={loading ? <LoadingLine label="Memuat data izin..." /> : error ? undefined :
          <EmptyState title={!permitted ? 'Halaman izin tidak tersedia' : isAssistant && filter === 'pending'
            ? 'Tidak ada izin menunggu review' : 'Belum ada pengajuan izin'}
          description={!permitted ? 'Kembali ke beranda dan pilih halaman yang sesuai dengan akun Anda.'
            : isAssistant ? 'Pengajuan izin untuk sesi ini akan muncul di sini.' : 'Pengajuan izin Anda akan ditampilkan di sini setelah dikirim.'} />}
        renderItem={({ item }) => {
          const targetSession = sessions.find((entry) => entry.id === item.sessionId);
          const tone = decisionTone[item.decision];
          const classified = item.classification.status === 'classified';
          return <Panel accent={toneSolid[tone]} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.decision, decisionSurface[tone]]}>
                <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                  style={[styles.decisionGlyph, { color: toneSolid[tone] }]}>{decisionGlyph[item.decision]}</Text>
                <Text style={[styles.decisionText, { color: toneText[tone] }]}>{leaveDecisionLabels[item.decision]}</Text>
              </View>
              <Text style={styles.submitted}>Diajukan: {formatLeaveDateTime(item.submittedAtMillis)} WIB</Text>
            </View>

            <View style={styles.who}>
              {isAssistant ? <>
                <Text accessibilityRole="header" style={styles.heading}>{item.studentName || 'Pengajuan praktikan'}</Text>
                <Text style={item.studentId ? styles.nim : styles.body}>{item.studentId ? `NIM ${item.studentId}` : 'Identitas praktikan belum tersedia'}</Text>
              </> : <Text accessibilityRole="header" style={styles.heading}>{targetSession?.courseName ?? 'Detail sesi tidak tersedia'}</Text>}
              {!isAssistant && targetSession && <Text style={styles.body}>Kelas {targetSession.className} · {formatSessionDate(targetSession.date)}</Text>}
            </View>

            <View style={styles.reasonBlock}>
              <Text style={styles.label}>Alasan izin</Text>
              <Text style={styles.reason}>{item.reason}</Text>
            </View>

            <View style={[styles.classification, classified ? styles.classificationReady : styles.classificationIdle]}>
              <Text style={styles.classificationLabel}>{classificationLabel(item.classification)}</Text>
              {isAssistant && !classified && <Text style={styles.body}>Anda tetap dapat meninjau alasan dan mengambil keputusan.</Text>}
            </View>

            {item.decision !== 'pending' && (
              <Text style={styles.reviewed}>Direview asisten: {formatLeaveDateTime(item.reviewedAtMillis)} WIB</Text>
            )}

            {isAssistant && permitted && onReview && item.decision === 'pending' && <ActionRow>
              <Button variant="primary" grow label="Terima izin" accessibilityLabel={`Terima izin ${item.studentName || 'praktikan'}`}
                disabled={saving} onPress={() => { setWriteError(''); setSelection({ id: item.id, decision: 'approved' }); setConfirming(true); }} />
              <Button variant="dangerOutline" grow label="Tolak izin" accessibilityLabel={`Tolak izin ${item.studentName || 'praktikan'}`}
                disabled={saving} onPress={() => { setWriteError(''); setSelection({ id: item.id, decision: 'rejected' }); setConfirming(true); }} />
            </ActionRow>}
          </Panel>;
        }}
      />
      <ConfirmationModal visible={confirming && !!selected && !!selection} title={selection?.decision === 'approved' ? 'Terima pengajuan izin?' : 'Tolak pengajuan izin?'}
        message="Keputusan ini akan dikirim ke praktikan dan tidak dapat diubah dari halaman ini."
        confirmLabel={saving ? 'Menyimpan…' : selection?.decision === 'approved' ? 'Ya, terima izin' : 'Ya, tolak izin'}
        variant={selection?.decision === 'rejected' ? 'danger' : 'primary'} confirmDisabled={saving} cancelDisabled={saving}
        onCancel={() => { if (!locked.current) setConfirming(false); }} onConfirm={() => { void confirm(); }} />
    </SafeAreaView>
  );
}

const decisionSurface = StyleSheet.create({
  info: { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
  success: { backgroundColor: colors.success.background, borderColor: colors.success.border },
  danger: { backgroundColor: colors.danger.background, borderColor: colors.danger.border },
  warning: { backgroundColor: colors.warning.background, borderColor: colors.warning.border },
  neutral: { backgroundColor: colors.neutral.background, borderColor: colors.neutral.border },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.readable, alignSelf: 'center', padding: space.lg, paddingBottom: space.huge },
  compactContent: { paddingHorizontal: space.md },
  wideContent: { maxWidth: 760, paddingHorizontal: space.xxl, paddingTop: space.xxl },
  header: { gap: space.lg, paddingBottom: space.lg },
  sessionPanel: { gap: space.xs, backgroundColor: colors.surface },
  sessionTitle: { ...type.heading, color: colors.text },
  sessionMeta: { ...type.body, color: colors.textSecondary },
  intro: { ...type.body, color: colors.textSecondary, maxWidth: 560 },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  count: { ...type.label, fontSize: 14, color: colors.text },
  segment: {
    flexDirection: 'row',
    flexGrow: 1,
    flexBasis: 240,
    maxWidth: 360,
    padding: 3,
    gap: 3,
    borderRadius: radii.md + 2,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  segmentButton: { flexGrow: 1, flexBasis: 0, minWidth: 0, paddingHorizontal: space.sm, borderRadius: radii.md },
  card: { marginBottom: space.md, gap: space.lg },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  decision: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  decisionGlyph: { ...type.label, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  decisionText: { ...type.label, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  submitted: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  who: { gap: space.xxs },
  heading: { ...type.heading, color: colors.text },
  nim: { ...type.mono, color: colors.textSecondary },
  label: { ...type.eyebrow, color: colors.textMuted },
  body: { ...type.body, color: colors.textSecondary },
  reasonBlock: { gap: space.xs },
  reason: { ...type.body, fontSize: 16, lineHeight: 24, color: colors.text, flexShrink: 1 },
  classification: { paddingVertical: space.md, paddingHorizontal: space.md + 2, gap: space.xs, borderRadius: radii.md, borderWidth: 1 },
  classificationReady: { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
  classificationIdle: { backgroundColor: colors.surfaceSunken, borderColor: colors.neutral.border, borderStyle: 'dashed' },
  classificationLabel: { ...type.label, fontSize: 14, lineHeight: 20, color: colors.text },
  reviewed: { ...type.caption, color: colors.textSecondary },
});
