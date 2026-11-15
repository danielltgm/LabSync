import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/common/StatusBadge';
import { MetaList, MetaRow, Panel } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { Session } from '@/types/session';

/** Formats an ISO `YYYY-MM-DD` date for display; falls back to the raw value. */
export function formatSessionDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const value = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(value.getTime())) return date;
  try {
    return value.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return date;
  }
}

/**
 * Shared session "sheet" used on both home roles: date + status, serif course name,
 * the time slot as the dominant figure, then class/room/assistant.
 */
export function SessionSheet({ session, children, headerLevel = true }: {
  session: Session;
  children?: ReactNode;
  headerLevel?: boolean;
}) {
  const open = session.status === 'DIBUKA';
  return (
    <Panel accent={open ? colors.success.solid : undefined} style={styles.sheet}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{formatSessionDate(session.date)}</Text>
        <StatusBadge status={session.status} />
      </View>
      <View style={styles.headline}>
        <Text accessibilityRole={headerLevel ? 'header' : undefined} style={styles.course}>{session.courseName}</Text>
        <Text style={styles.time}>
          {session.startTime}–{session.endTime} <Text style={styles.zone}>WIB</Text>
        </Text>
      </View>
      <MetaList>
        <MetaRow label="Kelas" value={session.className} />
        <MetaRow label="Ruang" value={session.labRoom} />
        <MetaRow label="Asisten" value={session.assistantName} />
      </MetaList>
      {children ? <View style={styles.footer}>{children}</View> : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  sheet: { flexGrow: 1, gap: space.lg },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  date: { ...type.mono, fontSize: 13, lineHeight: 18, color: colors.textSecondary, flexShrink: 1 },
  headline: { gap: space.xs },
  course: { ...type.heading, color: colors.text },
  time: { ...type.monoStrong, color: colors.text },
  zone: { ...type.caption, fontFamily: undefined, color: colors.textMuted },
  footer: { gap: space.md, marginTop: 'auto', paddingTop: space.xs },
});
