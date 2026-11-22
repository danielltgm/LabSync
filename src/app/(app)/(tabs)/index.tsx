import { router } from 'expo-router';
import {
  ArrowRight,
  Building,
  CalendarPlus,
  CircleExclamationPoint,
  ClipboardList,
  Monitor,
  Inbox,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { HomeHeader } from '@/components/app/home-header';
import { Shortcuts } from '@/components/app/nav-customizer';
import { Mascot } from '@/components/app/mascot';
import { Avatar, Columns, EmptyState, ListRow, RowDivider, RowGroup, StatTile, Surface } from '@/components/app/primitives';
import { LinkAction, Screen, Section } from '@/components/app/screen';
import { SessionHero, TimelineRow } from '@/components/app/session-blocks';
import { Pill, type Tone } from '@/components/app/status';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attendanceFor, classMatrix, focusSessions, leaveFor, sessionsForUser, studentStats, userByNim, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useLayout } from '@/hooks/use-layout';
import { useNow } from '@/hooks/use-now';
import { DAY, isSameDay, relativeDay, relativeTime, startOfDay } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function HomeScreen() {
  const me = useMe();
  if (me.role === 'SUPERADMIN') return <AdminHome />;
  if (me.role === 'ASISTEN') return <AssistantHome />;
  return <StudentHome />;
}

/* ---------------------------------------------------------------- Student */

function StudentHome() {
  const { state } = useStore();
  const me = useMe();
  const now = useNow(1000);
  const sessions = useMemo(() => sessionsForUser(state, me), [state, me]);
  const { live, upcoming } = focusSessions(sessions, now);
  const liveTodo = live.find((s) => !attendanceFor(state, s.id, me.nim)) ?? live[0];
  const hero = liveTodo ?? upcoming[0];
  const today = sessions.filter((s) => isSameDay(s.startsAt, now));
  const later = upcoming.filter((s) => !isSameDay(s.startsAt, now)).slice(0, 3);
  const stats = useMemo(() => studentStats(state, me.nim), [state, me.nim]);
  const pendingLeaves = state.leaves.filter((l) => l.nim === me.nim && l.decision === 'pending').length;
  const atRisk = stats.perClass.filter((p) => p.tally.rate < 80);
  const weekCount = sessions.filter((s) => s.startsAt >= startOfDay(now) && s.startsAt < startOfDay(now) + 7 * DAY).length;
  const { split: wide } = useLayout();

  const heroCard = hero ? (
    <SessionHero session={hero} now={now} role="PRAKTIKAN" record={attendanceFor(state, hero.id, me.nim)} />
  ) : (
    <Surface>
      <EmptyState icon={Monitor} title="Tidak ada praktikum terjadwal" body="Jadwal baru akan muncul di sini." />
    </Surface>
  );

  // Side column on wide screens is narrow: wrap to 2 + 1 so labels are not truncated.
  const statRow = (
    <View className={cn('flex-row gap-3', wide && 'flex-wrap')}>
      <StatTile className={wide ? 'min-w-[40%]' : undefined}
        label="Kehadiran"
        value={`${stats.overall.rate}%`}
        hint={`${stats.overall.HADIR + stats.overall.TERLAMBAT}/${stats.overall.total} sesi`}
        tone={stats.overall.rate >= 80 ? 'brand' : 'danger'}
        bright
        onPress={() => router.push('/riwayat')}
      />
      <StatTile className={wide ? 'min-w-[40%]' : undefined} label="Izin aktif" value={pendingLeaves} hint="menunggu" tone="warning" bright onPress={() => router.push('/izin')} />
      <StatTile className={wide ? 'min-w-[40%]' : undefined} label="Minggu ini" value={weekCount} hint="sesi" tone="info" onPress={() => router.push('/jadwal')} />
    </View>
  );

  const riskBanner = atRisk.length > 0 && (
    <Pressable
      onPress={() => router.push('/riwayat')}
      className="bg-mustard flex-row items-start gap-3 rounded-[24px] p-4 active:opacity-90"
    >
      <Icon as={CircleExclamationPoint} className="text-on-bright mt-0.5 size-6" strokeWidth={2.4} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-on-bright font-display text-xl font-extrabold uppercase leading-6">Kehadiran mendekati batas</Text>
        <Text className="text-on-bright text-[13px] font-medium leading-5">
          {atRisk.map((p) => `${p.course.name} ${p.tally.rate}%`).join(', ')}. Minimal 75% untuk ikut responsi.
        </Text>
      </View>
    </Pressable>
  );

  const todaySection = (
    <Section title="Hari ini" action={<LinkAction label="Lihat jadwal" onPress={() => router.push('/jadwal')} />}>
      {today.length ? (
        <View>
          {today.map((s, i) => (
            <TimelineRow
              key={s.id}
              session={s}
              now={now}
              record={attendanceFor(state, s.id, me.nim)}
              leave={leaveFor(state, s.id, me.nim)}
              last={i === today.length - 1}
            />
          ))}
        </View>
      ) : (
        <Surface>
          <EmptyState icon={Sparkles} title="Hari ini bebas praktikum" body="Gunakan waktunya untuk mengerjakan laporan." />
        </Surface>
      )}
    </Section>
  );

  const laterSection = later.length > 0 && (
    <Section title="Berikutnya">
      <RowGroup>
        {later.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <RowDivider />}
            <ListRow
              title={s.course.name}
              subtitle={`${relativeDay(s.startsAt, now)} · P${s.meetingNo} ${s.topic}`}
              leading={<DateBadge ms={s.startsAt} />}
              trailing={s.changeNote ? <Pill tone="warning" label="Berubah" /> : undefined}
              onPress={() => router.push(`/sesi/${s.id}`)}
            />
          </View>
        ))}
      </RowGroup>
    </Section>
  );

  const shortcuts = <Shortcuts />;

  return (
    <Screen tabs>
      <HomeHeader now={now} />
      {wide ? (
        <Columns
          main={
            <>
              {heroCard}
              {riskBanner}
              {todaySection}
            </>
          }
          side={
            <>
              {statRow}
              {laterSection}
              {shortcuts}
            </>
          }
        />
      ) : (
        <>
          {heroCard}
          {statRow}
          {riskBanner}
          {todaySection}
          {laterSection}
          {shortcuts}
        </>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------- Assistant */

function AssistantHome() {
  const { state } = useStore();
  const me = useMe();
  const now = useNow(1000);
  const sessions = useMemo(() => sessionsForUser(state, me), [state, me]);
  const { live, upcoming } = focusSessions(sessions, now);
  const hero = live[0] ?? upcoming[0];
  const classIds = new Set(sessions.map((s) => s.classId));
  const pending = state.leaves
    .filter((l) => l.decision === 'pending')
    .map((l) => ({
      leave: l,
      session: viewSession(
        state,
        state.sessions.find((s) => s.id === l.sessionId)!,
      ),
    }))
    .filter((x) => classIds.has(x.session.classId))
    .sort((a, b) => b.leave.submittedAt - a.leave.submittedAt);
  const today = sessions.filter((s) => isSameDay(s.startsAt, now));
  const rosterSize = hero ? hero.cls.studentNims.length : 0;
  const checkedIn = hero
    ? state.attendance.filter((a) => a.sessionId === hero.id && (a.status === 'HADIR' || a.status === 'TERLAMBAT')).length
    : 0;
  const flagged = hero ? state.attempts.filter((a) => a.sessionId === hero.id && !a.ok).length : 0;
  const myClasses = state.classes.filter((c) => c.assistantNims.includes(me.nim));
  const { split: wide } = useLayout();

  const heroCard = hero ? (
    <SessionHero session={hero} now={now} role="ASISTEN" checkedInCount={checkedIn} rosterSize={live.length ? rosterSize : undefined} />
  ) : (
    <Surface>
      <EmptyState
        icon={CalendarPlus}
        title="Belum ada sesi"
        body="Buat jadwal pertemuan untuk kelasmu."
        actionLabel="Buat sesi"
        onAction={() => router.push('/sesi/baru')}
      />
    </Surface>
  );

  // Side column on wide screens is narrow: wrap to 2 + 1 so labels are not truncated.
  const statRow = (
    <View className={cn('flex-row gap-3', wide && 'flex-wrap')}>
      <StatTile className={wide ? 'min-w-[40%]' : undefined} label="Izin masuk" value={pending.length} hint="ditinjau" tone="warning" bright onPress={() => router.push('/izin')} />
      <StatTile className={wide ? 'min-w-[40%]' : undefined}
        label="Kelas"
        value={myClasses.length}
        hint={`${myClasses.reduce((s, c) => s + c.studentNims.length, 0)} praktikan`}
        tone="brand"
        onPress={() => router.push('/kelas')}
      />
      <StatTile className={wide ? 'min-w-[40%]' : undefined}
        label="Ditolak sistem"
        value={flagged}
        hint="hari ini"
        tone="danger"
        bright
        onPress={() => hero && router.push(`/rekap/${hero.id}`)}
      />
    </View>
  );

  const reviewSection = pending.length > 0 && (
    <Section title="Perlu ditinjau" action={<LinkAction label="Semua izin" onPress={() => router.push('/izin')} />}>
      <RowGroup>
        {pending.slice(0, 3).map(({ leave, session }, i) => {
          const student = userByNim(state, leave.nim);
          return (
            <View key={leave.id}>
              {i > 0 && <RowDivider />}
              <ListRow
                title={student?.name ?? leave.nim}
                subtitle={`${leave.category ?? 'Belum dikategorikan'} · ${session.course.name} P${session.meetingNo} · ${relativeTime(leave.submittedAt, now)}`}
                leading={<Avatar name={student?.name ?? '?'} size="sm" />}
                onPress={() => router.push(`/izin/${leave.id}`)}
              />
            </View>
          );
        })}
      </RowGroup>
    </Section>
  );

  const todaySection = (
    <Section title="Jadwal hari ini" action={<LinkAction label="Kalender" onPress={() => router.push('/jadwal')} />}>
      {today.length ? (
        <View>
          {today.map((s, i) => (
            <TimelineRow key={s.id} session={s} now={now} last={i === today.length - 1} />
          ))}
        </View>
      ) : (
        <Surface>
          <EmptyState icon={Sparkles} title="Tidak ada sesi hari ini" />
        </Surface>
      )}
    </Section>
  );

  const manage = <Shortcuts />;

  return (
    <Screen tabs>
      <HomeHeader now={now} />
      {wide ? (
        <Columns
          main={
            <>
              {heroCard}
              {todaySection}
            </>
          }
          side={
            <>
              {statRow}
              {reviewSection}
              {manage}
            </>
          }
        />
      ) : (
        <>
          {heroCard}
          {statRow}
          {reviewSection}
          {todaySection}
          {manage}
        </>
      )}
    </Screen>
  );
}

/* ------------------------------------------------------------------ Admin */

function AdminHome() {
  const { state } = useStore();
  const now = useNow(5000);
  const live = state.sessions.filter((s) => s.status === 'DIBUKA').map((s) => viewSession(state, s));
  const assistants = state.users.filter((u) => u.role === 'ASISTEN');
  const requests = state.notifications.filter((n) => n.type === 'SYSTEM' && n.href === '/admin' && !n.readAt);

  const heroCard = (
    <Surface className="bg-ink gap-4 overflow-hidden p-5">
      <View className="absolute -bottom-20 -right-16 size-60 rounded-full border-[28px] border-white/5" />
      <View className="flex-row items-end gap-2">
        <View className="min-w-0 flex-1 gap-2">
          <View className="bg-mustard flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5">
            <Icon as={ShieldCheck} className="text-on-bright size-3.5" strokeWidth={2.4} />
            <Text className="text-on-bright font-mono text-[11px] font-bold uppercase">Superadmin</Text>
          </View>
          <Text className="text-ink-foreground font-display text-[36px] font-extrabold uppercase leading-[36px]">Konsol koordinator</Text>
          <Text className="text-ink-muted text-sm font-medium">Atur asisten, kelas, dan lokasi lab tanpa menyentuh database.</Text>
        </View>
        <Mascot mood="determined" size={88} />
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => router.push('/kelas/baru')}
          className="bg-aqua h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full active:opacity-90"
        >
          <Icon as={CalendarPlus} className="text-on-bright size-5" strokeWidth={2.4} />
          <Text className="text-on-bright text-base font-bold">Kelas baru</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/admin')}
          className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full border-2 border-white/20 active:opacity-90"
        >
          <Text className="text-ink-foreground text-base font-bold">Pengguna</Text>
          <Icon as={ArrowRight} className="text-ink-foreground size-5" strokeWidth={2.4} />
        </Pressable>
      </View>
    </Surface>
  );

  const stats = (
    <View className="flex-row flex-wrap gap-3">
      <StatTile
        className="min-w-[45%]"
        label="Pengguna"
        value={state.users.length}
        hint={`${assistants.length} asisten`}
        icon={Users}
        bright
        onPress={() => router.push('/admin')}
      />
      <StatTile
        className="min-w-[45%]"
        label="Lab aktif"
        value={state.labs.length}
        hint={`${live.length} sedang dipakai`}
        icon={Building}
        tone="info"
        onPress={() => router.push('/lab')}
      />
      <StatTile
        className="min-w-[45%]"
        label="Kelas"
        value={state.classes.length}
        hint={`${state.courses.length} mata praktikum`}
        icon={ClipboardList}
        tone="success"
        onPress={() => router.push('/kelas')}
      />
      <StatTile
        className="min-w-[45%]"
        label="Permintaan"
        value={requests.length}
        hint="akses asisten"
        icon={Inbox}
        tone="warning"
        bright
        onPress={() => router.push('/admin')}
      />
    </View>
  );

  const liveSection = (
    <Section title="Sedang berlangsung" action={<LinkAction label="Peta" onPress={() => router.push('/peta')} />}>
      {live.length ? (
        <View>
          {live.map((s, i) => (
            <TimelineRow key={s.id} session={s} now={now} last={i === live.length - 1} />
          ))}
        </View>
      ) : (
        <Surface>
          <EmptyState icon={Monitor} title="Semua lab kosong" />
        </Surface>
      )}
    </Section>
  );

  // Classes that need the coordinator: no assistant, weak attendance, or nothing graded yet.
  const attention = state.classes
    .map((cls) => {
      const course = state.courses.find((c) => c.id === cls.courseId)!;
      const { rows } = classMatrix(state, cls.id);
      const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.tally.rate, 0) / rows.length) : 100;
      const graded = state.assignments.some((a) => a.classId === cls.id && cls.studentNims.some((n) => state.grades[`${a.id}__${n}`] !== undefined));
      const issue = !cls.assistantNims.length
        ? { label: 'Belum ada asisten', tone: 'danger' as Tone }
        : avg < 85
          ? { label: `Rata-rata hadir ${avg}%`, tone: 'warning' as Tone }
          : !graded
            ? { label: 'Belum ada nilai', tone: 'neutral' as Tone }
            : null;
      return issue ? { cls, course, issue } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const attentionSection = (
    <Section title="Perlu perhatian" action={<LinkAction label="Semua kelas" onPress={() => router.push('/kelas')} />}>
      {attention.length ? (
        <RowGroup>
          {attention.slice(0, 5).map(({ cls, course, issue }, i) => (
            <View key={cls.id}>
              {i > 0 && <RowDivider />}
              <ListRow
                title={`${course.name} · ${cls.label}`}
                subtitle={`${cls.studentNims.length} praktikan · ${cls.assistantNims.length} asisten`}
                trailing={<Pill tone={issue.tone} label={issue.label} />}
                onPress={() => router.push(`/kelas/${cls.id}`)}
              />
            </View>
          ))}
        </RowGroup>
      ) : (
        <Surface>
          <EmptyState icon={ClipboardList} title="Semua kelas aman" />
        </Surface>
      )}
    </Section>
  );

  // Phones: hero, stats, live (Columns stacks main then side, so pass stats with the hero).
  return (
    <Screen tabs>
      <HomeHeader now={now} />
      <AdminColumns hero={heroCard} stats={stats} live={liveSection} attention={attentionSection} shortcuts={<Shortcuts />} />
    </Screen>
  );
}

function AdminColumns({
  hero,
  stats,
  live,
  attention,
  shortcuts,
}: {
  hero: React.ReactNode;
  stats: React.ReactNode;
  live: React.ReactNode;
  attention: React.ReactNode;
  shortcuts: React.ReactNode;
}) {
  const { split: wide } = useLayout();
  return wide ? (
    <Columns
      main={
        <>
          {hero}
          {attention}
          {live}
        </>
      }
      side={
        <>
          {stats}
          {shortcuts}
        </>
      }
    />
  ) : (
    <>
      {hero}
      {stats}
      {shortcuts}
      {attention}
      {live}
    </>
  );
}

/* ---------------------------------------------------------------- Bits */

export function DateBadge({ ms, className }: { ms: number; className?: string }) {
  const d = new Date(ms);
  return (
    <View className={cn('bg-ink w-12 items-center rounded-2xl py-1.5', className)}>
      <Text className="text-ink-muted font-mono text-[10px] font-bold uppercase">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()]}
      </Text>
      <Text className="text-ink-foreground font-display text-2xl font-extrabold leading-7">{d.getDate()}</Text>
    </View>
  );
}
