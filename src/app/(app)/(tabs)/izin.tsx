import { router } from 'expo-router';
import { FileText, Inbox, Paperclip, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, EmptyState, Segmented, Surface, Grid } from '@/components/app/primitives';
import { Screen, TabTitle } from '@/components/app/screen';
import { AiCategoryPill, LEAVE_STATUS, Pill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { classesForUser, userByNim, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import type { LeaveDecision } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { relativeDay, relativeTime } from '@/lib/format';

export default function LeaveList() {
  const { state } = useStore();
  const me = useMe();
  const now = useNow(30_000);
  const isStudent = me.role === 'PRAKTIKAN';
  const [tab, setTab] = useState<LeaveDecision>('pending');

  const items = useMemo(() => {
    const classIds = new Set(classesForUser(state, me).map((c) => c.id));
    return state.leaves
      .map((leave) => ({ leave, session: viewSession(state, state.sessions.find((s) => s.id === leave.sessionId)!) }))
      .filter(({ leave, session }) => (isStudent ? leave.nim === me.nim : classIds.has(session.classId)))
      .sort((a, b) => b.leave.submittedAt - a.leave.submittedAt);
  }, [state, me, isStudent]);

  const count = (d: LeaveDecision) => items.filter((i) => i.leave.decision === d).length;
  const shown = items.filter((i) => i.leave.decision === tab);

  return (
    <Screen tabs>
      <TabTitle
        eyebrow={isStudent ? 'Riwayat dan status izinmu' : `${count('pending')} menunggu keputusan`}
        title={isStudent ? 'Izin' : 'Tinjau izin'}
        right={
          isStudent ? (
            <Button size="sm" className="h-10 rounded-full px-4" onPress={() => router.push('/izin/baru')}>
              <Icon as={Plus} className="text-primary-foreground size-4" />
              <Text>Ajukan</Text>
            </Button>
          ) : undefined
        }
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={(['pending', 'approved', 'rejected'] as const).map((d) => ({ value: d, label: LEAVE_STATUS[d].label, count: count(d) }))}
      />

      {shown.length === 0 ? (
        <Surface>
          <EmptyState
            icon={tab === 'pending' ? Inbox : FileText}
            title={tab === 'pending' ? (isStudent ? 'Tidak ada izin yang menunggu' : 'Semua izin sudah ditinjau') : 'Belum ada'}
            body={isStudent && tab === 'pending' ? 'Ajukan izin sebelum pertemuan dimulai agar asisten sempat meninjau.' : undefined}
            actionLabel={isStudent && tab === 'pending' ? 'Ajukan izin' : undefined}
            onAction={() => router.push('/izin/baru')}
          />
        </Surface>
      ) : (
        <Grid>
          {shown.map(({ leave, session }) => {
            const student = userByNim(state, leave.nim);
            return (
              <Pressable
                key={leave.id}
                accessibilityRole="button"
                onPress={() => router.push(`/izin/${leave.id}`)}
                className="bg-card border-border active:bg-accent flex-1 gap-3 rounded-3xl border p-4"
              >
                <View className="flex-row items-center gap-3">
                  {isStudent ? null : <Avatar name={student?.name ?? '?'} size="sm" />}
                  <View className="min-w-0 flex-1">
                    <Text className="text-[15px] font-semibold" numberOfLines={1}>{isStudent ? session.course.name : student?.name}</Text>
                    <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                      {isStudent ? '' : `${session.course.name} · `}P{session.meetingNo} · {relativeDay(session.startsAt, now)}
                    </Text>
                  </View>
                  <Pill tone={LEAVE_STATUS[leave.decision].tone} label={LEAVE_STATUS[leave.decision].label} />
                </View>
                <Text className="text-[14px] leading-5" numberOfLines={2}>{leave.reason}</Text>
                <View className="flex-row flex-wrap items-center gap-2">
                  <AiCategoryPill category={leave.category} />
                  {leave.attachmentName && (
                    <View className="flex-row items-center gap-1">
                      <Icon as={Paperclip} className="text-muted-foreground size-3.5" />
                      <Text className="text-muted-foreground text-xs">{leave.attachmentName}</Text>
                    </View>
                  )}
                  <Text className="text-muted-foreground ml-auto text-xs">{relativeTime(leave.submittedAt, now)}</Text>
                </View>
              </Pressable>
            );
          })}
        </Grid>
      )}
    </Screen>
  );
}
