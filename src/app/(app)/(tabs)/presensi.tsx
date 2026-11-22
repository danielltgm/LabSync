import { router } from 'expo-router';
import { BellRing, CalendarClock, Play, RotateCcw, ScanLine } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CheckInPanel, SessionSummary } from '@/components/app/check-in-panel';
import { ConfirmDialog } from '@/components/app/confirm';
import { EmptyState, ListRow, RowDivider, RowGroup, Segmented, Surface, Columns } from '@/components/app/primitives';
import { CloseSessionButton, QrPanel } from '@/components/app/qr-panel';
import { LinkAction, Screen, Section, TabTitle } from '@/components/app/screen';
import { AttendancePill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attendanceFor, focusSessions, sessionsForUser, type SessionView } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { countdown, formatClock, formatDateTime, HOUR, relativeDay } from '@/lib/format';

export default function AttendanceTab() {
  const me = useMe();
  return me.role === 'PRAKTIKAN' ? <StudentAttendance /> : <AssistantQr />;
}

function StudentAttendance() {
  const { state } = useStore();
  const me = useMe();
  const now = useNow(1000);
  const sessions = useMemo(() => sessionsForUser(state, me), [state, me]);
  const { live, next } = focusSessions(sessions, now);
  const [picked, setPicked] = useState<string | null>(null);
  const current = live.find((s) => s.id === picked) ?? live.find((s) => !attendanceFor(state, s.id, me.nim)) ?? live[0];
  const recent = state.attendance
    .filter((a) => a.nim === me.nim)
    .sort((a, b) => b.checkedInAt - a.checkedInAt)
    .slice(0, 5)
    .map((a) => ({ a, s: sessions.find((s) => s.id === a.sessionId)! }))
    .filter((x) => x.s);

  return (
    <Screen tabs>
      <TabTitle eyebrow={`Jam server ${formatClock(now)}`} title="Presensi" />
      {live.length > 1 && (
        <Segmented
          value={current?.id ?? ''}
          onChange={setPicked}
          options={live.map((s) => ({ value: s.id, label: s.course.name.split(' ').slice(0, 2).join(' ') }))}
        />
      )}
      {current ? (
        <>
          <SessionSummary session={current} now={now} />
          <CheckInPanel session={current} compact />
        </>
      ) : (
        <Waiting next={next} now={now} />
      )}
      {recent.length > 0 && (
        <Section title="Presensi terakhir" action={<LinkAction label="Riwayat" onPress={() => router.push('/riwayat')} />}>
          <RowGroup>
            {recent.map(({ a, s }, i) => (
              <View key={a.id}>
                {i > 0 && <RowDivider />}
                <ListRow
                  title={s.course.name}
                  subtitle={`P${s.meetingNo} · ${formatDateTime(a.checkedInAt)}`}
                  trailing={<AttendancePill status={a.status} />}
                  chevron={false}
                />
              </View>
            ))}
          </RowGroup>
        </Section>
      )}
    </Screen>
  );
}

function Waiting({ next, now }: { next?: SessionView; now: number }) {
  if (!next) {
    return (
      <Surface>
        <EmptyState icon={CalendarClock} title="Tidak ada sesi aktif" body="Belum ada jadwal praktikum berikutnya." />
      </Surface>
    );
  }
  const soon = next.startsAt - now < 2 * HOUR;
  return (
    <Surface className="items-center gap-5 px-5 py-8">
      <View className="bg-info-soft size-16 items-center justify-center rounded-full">
        <Icon as={CalendarClock} className="text-info-ink size-8" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-muted-foreground text-sm font-medium">Sesi berikutnya</Text>
        <Text className="text-center text-xl font-bold">{next.course.name}</Text>
        <Text className="text-muted-foreground text-center text-sm">
          P{next.meetingNo} · {next.topic} · {next.lab.name}
        </Text>
      </View>
      <View className="items-center">
        <Text className="text-4xl font-bold tracking-tight" style={{ fontVariant: ['tabular-nums'] }}>
          {soon ? countdown(next.startsAt, now) : relativeDay(next.startsAt, now)}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {soon ? 'menuju mulai' : `${new Date(next.startsAt).getHours()}.${String(new Date(next.startsAt).getMinutes()).padStart(2, '0')}`}
        </Text>
      </View>
      <View className="bg-muted w-full flex-row items-center gap-3 rounded-2xl p-3">
        <Icon as={BellRing} className="text-primary size-5" />
        <Text className="text-muted-foreground min-w-0 flex-1 text-[13px] leading-5">
          Kamu akan dapat notifikasi saat asisten membuka sesi. Tombol presensi aktif otomatis.
        </Text>
      </View>
      <Button variant="outline" className="w-full rounded-2xl" size="lg" onPress={() => router.push('/scan')}>
        <Icon as={ScanLine} className="size-5" />
        <Text>Pindai QR</Text>
      </Button>
    </Surface>
  );
}

/* --------------------------------------------------------------- Assistant */

function AssistantQr() {
  const { state, openSession, closeSession, toast } = useStore();
  const me = useMe();
  const now = useNow(5000);
  const sessions = useMemo(() => sessionsForUser(state, me), [state, me]);
  const { live, upcoming } = focusSessions(sessions, now);
  const [picked, setPicked] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'open' | 'close' | null>(null);
  const [target, setTarget] = useState<SessionView | null>(null);
  const current = live.find((s) => s.id === picked) ?? live[0];
  const openable = upcoming.slice(0, 4);

  const doOpen = (s: SessionView) => {
    const count = openSession(s.id);
    toast({ title: 'Sesi dibuka', body: `Notifikasi push terkirim ke ${count} praktikan.`, tone: 'success' });
    setPicked(s.id);
  };

  return (
    <Screen tabs>
      <TabTitle eyebrow={current ? 'Sesi sedang dibuka' : 'Belum ada sesi dibuka'} title="QR Sesi" />
      {live.length > 1 && (
        <Segmented
          value={current?.id ?? ''}
          onChange={setPicked}
          options={live.map((s) => ({ value: s.id, label: `${s.cls.label} · P${s.meetingNo}` }))}
        />
      )}
      <Columns
        main={
          current ? (
            <>
              <QrPanel session={current} />
              <CloseSessionButton
                onPress={() => {
                  setTarget(current);
                  setConfirm('close');
                }}
              />
            </>
          ) : (
            <Surface>
              <EmptyState icon={Play} title="Buka sesi untuk menampilkan QR" body="Praktikan baru bisa presensi setelah sesi dibuka." />
            </Surface>
          )
        }
        side={
          <>
            {openable.length > 0 && (
              <Section title="Siap dibuka">
                <RowGroup>
                  {openable.map((s, i) => (
                    <View key={s.id}>
                      {i > 0 && <RowDivider />}
                      <ListRow
                        title={`${s.course.name} · ${s.cls.label}`}
                        subtitle={`${relativeDay(s.startsAt, now)} · P${s.meetingNo} ${s.topic}`}
                        chevron={false}
                        trailing={
                          <Button
                            size="sm"
                            className="rounded-full"
                            onPress={() => {
                              setTarget(s);
                              setConfirm('open');
                            }}
                          >
                            <Text>Buka</Text>
                          </Button>
                        }
                      />
                    </View>
                  ))}
                </RowGroup>
              </Section>
            )}
            <Section>
              <Button variant="ghost" onPress={() => router.push('/jadwal')}>
                <Icon as={RotateCcw} className="size-4" />
                <Text>Lihat semua jadwal</Text>
              </Button>
            </Section>
          </>
        }
      />

      <ConfirmDialog
        open={confirm === 'open'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Buka sesi sekarang?"
        body={
          target
            ? `${target.course.name} ${target.cls.label} P${target.meetingNo}. ${target.cls.studentNims.length} praktikan akan menerima notifikasi.`
            : ''
        }
        confirmLabel="Buka sesi"
        onConfirm={() => target && doOpen(target)}
      />
      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Tutup sesi?"
        body="Praktikan yang belum presensi akan dicatat alpha, kecuali izinnya disetujui. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Tutup sesi"
        destructive
        onConfirm={() => target && closeSession(target.id)}
      />
    </Screen>
  );
}
