import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { EmptyState } from '@/components/common/EmptyState';
import { AttendanceScreenHeader } from '@/components/rekap/AttendanceScreenHeader';
import { LabSyncColors as colors, LabSyncRadii as radii, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
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

export function LeaveRequestsPanel({ mode, permitted, requests, sessions, session, loading, error, onBack, onRetry, onReview }: Props) {
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
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.header}>
          <AttendanceScreenHeader title={isAssistant ? 'Review Izin' : 'Status Izin Saya'} onBack={onBack} notice={error} onRetry={onRetry} />
          {permitted && <>
            {session && <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.heading}>{session.courseName}</Text>
              <Text style={styles.body}>Kelas {session.className} · {session.date}</Text>
            </View>}
            <Text style={styles.body}>{isAssistant
              ? 'Baca alasan dan saran kategori AI. Keputusan akhir tetap di tangan asisten.'
              : 'Status keputusan asisten diperbarui secara otomatis.'}</Text>
            {!loading && !error && <Text style={styles.heading}>{pending.length} menunggu review · {accessible.length} pengajuan</Text>}
            {isAssistant && <View style={styles.actions}>
              {(['pending', 'all'] as const).map((value) => <Pressable key={value} accessibilityRole="button"
                accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)}
                style={[styles.button, filter === value && styles.selected]}>
                <Text style={styles.buttonText}>{value === 'pending' ? 'Menunggu review' : 'Semua izin'}</Text>
              </Pressable>)}
            </View>}
          </>}
          {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.success}>{feedback}</Text>}
          {!!writeError && <Text accessibilityRole="alert" style={styles.error}>{writeError}</Text>}
          {saving && <Text accessibilityLiveRegion="polite" style={styles.body}>Menyimpan keputusan…</Text>}
        </View>}
        ListEmptyComponent={loading ? <Text accessibilityLiveRegion="polite" style={styles.body}>Memuat data izin...</Text> : error ? undefined :
          <EmptyState title={!permitted ? 'Halaman izin tidak tersedia' : isAssistant && filter === 'pending'
            ? 'Tidak ada izin menunggu review' : 'Belum ada pengajuan izin'}
          description={!permitted ? 'Kembali ke beranda dan pilih halaman yang sesuai dengan akun Anda.'
            : isAssistant ? 'Pengajuan izin untuk sesi ini akan muncul di sini.' : 'Pengajuan izin Anda akan ditampilkan di sini setelah dikirim.'} />}
        renderItem={({ item }) => {
          const targetSession = sessions.find((entry) => entry.id === item.sessionId);
          return <View style={styles.card}>
            <Text style={[styles.status, item.decision === 'approved' ? styles.success : item.decision === 'rejected' ? styles.error : styles.body]}>
              {leaveDecisionLabels[item.decision]}
            </Text>
            {isAssistant ? <>
              <Text accessibilityRole="header" style={styles.heading}>{item.studentName || 'Pengajuan praktikan'}</Text>
              <Text style={styles.body}>{item.studentId ? `NIM ${item.studentId}` : 'Identitas praktikan belum tersedia'}</Text>
            </> : <Text accessibilityRole="header" style={styles.heading}>{targetSession?.courseName ?? 'Detail sesi tidak tersedia'}</Text>}
            {!isAssistant && targetSession && <Text style={styles.body}>Kelas {targetSession.className} · {targetSession.date}</Text>}
            <Text style={styles.body}>Diajukan: {formatLeaveDateTime(item.submittedAtMillis)} WIB</Text>
            <Text style={styles.label}>Alasan izin</Text>
            <Text style={styles.reason}>{item.reason}</Text>
            <View style={styles.classification}>
              <Text style={styles.label}>{classificationLabel(item.classification)}</Text>
              {isAssistant && item.classification.status !== 'classified' && <Text style={styles.body}>Anda tetap dapat meninjau alasan dan mengambil keputusan.</Text>}
            </View>
            {item.decision !== 'pending' && <Text style={styles.body}>Direview asisten: {formatLeaveDateTime(item.reviewedAtMillis)} WIB</Text>}
            {isAssistant && permitted && onReview && item.decision === 'pending' && <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Terima izin ${item.studentName || 'praktikan'}`}
                disabled={saving} accessibilityState={{ disabled: saving }} onPress={() => { setWriteError(''); setSelection({ id: item.id, decision: 'approved' }); setConfirming(true); }}
                style={[styles.button, styles.approve, saving && styles.disabled]}><Text style={styles.approveText}>Terima izin</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Tolak izin ${item.studentName || 'praktikan'}`}
                disabled={saving} accessibilityState={{ disabled: saving }} onPress={() => { setWriteError(''); setSelection({ id: item.id, decision: 'rejected' }); setConfirming(true); }}
                style={[styles.button, saving && styles.disabled]}><Text style={styles.error}>Tolak izin</Text></Pressable>
            </View>}
          </View>;
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: space.lg, paddingBottom: space.xxxl },
  header: { gap: space.lg, paddingBottom: space.lg },
  card: { padding: space.xl, gap: space.sm, marginBottom: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral.border, borderRadius: radii.lg },
  heading: { ...type.section, color: colors.text },
  label: { ...type.button, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  reason: { ...type.body, color: colors.text, flexShrink: 1 },
  classification: { padding: space.md, gap: space.sm, backgroundColor: colors.primarySurface, borderRadius: radii.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: { flexGrow: 1, flexBasis: 130, minHeight: 48, padding: space.md, borderWidth: 1, borderColor: colors.borderDark, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  buttonText: { ...type.button, color: colors.primary },
  approve: { backgroundColor: colors.primary, borderColor: colors.primary },
  approveText: { ...type.button, color: colors.surface },
  status: { ...type.button },
  success: { ...type.body, color: colors.success.text },
  error: { ...type.body, color: colors.danger.text },
  disabled: { opacity: 0.5 },
});
