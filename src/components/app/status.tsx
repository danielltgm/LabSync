import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AttendanceStatus, LeaveCategory, LeaveDecision, SessionStatus } from '@/data/types';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'brand';

/**
 * soft/ink: quiet tinted pill. bright/onBright: loud poster block (coral, mustard, aqua, violet, sage).
 */
export const TONE_CLASSES: Record<Tone, { soft: string; ink: string; solid: string; border: string; bright: string; onBright: string }> = {
  success: { soft: 'bg-success-soft', ink: 'text-success-ink', solid: 'bg-success', border: 'border-success', bright: 'bg-sage', onBright: 'text-on-bright' },
  warning: { soft: 'bg-warning-soft', ink: 'text-warning-ink', solid: 'bg-warning', border: 'border-warning', bright: 'bg-mustard', onBright: 'text-on-bright' },
  info: { soft: 'bg-info-soft', ink: 'text-info-ink', solid: 'bg-info', border: 'border-info', bright: 'bg-aqua', onBright: 'text-on-bright' },
  danger: { soft: 'bg-danger-soft', ink: 'text-danger-ink', solid: 'bg-destructive', border: 'border-destructive', bright: 'bg-coral', onBright: 'text-on-bright' },
  neutral: { soft: 'bg-muted', ink: 'text-muted-foreground', solid: 'bg-muted-foreground', border: 'border-border', bright: 'bg-ink', onBright: 'text-ink-foreground' },
  brand: { soft: 'bg-brand-soft', ink: 'text-brand-ink', solid: 'bg-primary', border: 'border-primary', bright: 'bg-violet', onBright: 'text-white' },
};

export function Pill({ tone = 'neutral', label, dot, className }: { tone?: Tone; label: string; dot?: boolean; className?: string }) {
  const t = TONE_CLASSES[tone];
  return (
    <View className={cn('flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1', t.soft, className)}>
      {dot && <View className={cn('size-2 rounded-full', t.solid)} />}
      <Text className={cn('font-mono text-[11px] font-bold', t.ink)}>{label}</Text>
    </View>
  );
}

/** Category the AI assigned to a leave request (the student never picks it). */
export function AiCategoryPill({ category, className }: { category?: LeaveCategory; className?: string }) {
  return (
    <View className={cn('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', category ? 'bg-violet' : 'bg-foreground/10', className)}>
      <Icon as={Sparkles} className={cn('size-3', category ? 'text-white' : 'text-muted-foreground')} strokeWidth={2.4} />
      <Text className={cn('font-mono text-[11px] font-bold', category ? 'text-white' : 'text-muted-foreground')}>
        {category ?? 'Belum dikategorikan'}
      </Text>
    </View>
  );
}

export const SESSION_STATUS: Record<SessionStatus, { label: string; tone: Tone }> = {
  TERJADWAL: { label: 'Terjadwal', tone: 'info' },
  DIBUKA: { label: 'Dibuka', tone: 'success' },
  SELESAI: { label: 'Selesai', tone: 'neutral' },
  DIBATALKAN: { label: 'Dibatalkan', tone: 'danger' },
};

export const ATTENDANCE_STATUS: Record<AttendanceStatus, { label: string; tone: Tone; short: string }> = {
  HADIR: { label: 'Hadir', tone: 'success', short: 'H' },
  TERLAMBAT: { label: 'Terlambat', tone: 'warning', short: 'T' },
  IZIN: { label: 'Izin', tone: 'info', short: 'I' },
  ALPHA: { label: 'Alpha', tone: 'danger', short: 'A' },
};

export const LEAVE_STATUS: Record<LeaveDecision, { label: string; tone: Tone }> = {
  pending: { label: 'Menunggu', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'success' },
  rejected: { label: 'Ditolak', tone: 'danger' },
};

export function SessionStatusPill({ status, className }: { status: SessionStatus; className?: string }) {
  const s = SESSION_STATUS[status];
  return <Pill tone={s.tone} label={s.label} dot={status === 'DIBUKA'} className={className} />;
}

export function AttendancePill({ status, className }: { status: AttendanceStatus; className?: string }) {
  const s = ATTENDANCE_STATUS[status];
  return <Pill tone={s.tone} label={s.label} className={className} />;
}

export function LeavePill({ decision, className }: { decision: LeaveDecision; className?: string }) {
  const s = LEAVE_STATUS[decision];
  return <Pill tone={s.tone} label={`Izin ${s.label.toLowerCase()}`} className={className} />;
}
