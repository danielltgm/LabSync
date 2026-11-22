import { router, useLocalSearchParams } from 'expo-router';
import {
  Ban,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleExclamationPoint,
  CircleStop,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  MapPin,
  Pencil,
  Play,
  QrCode,
  ScanLine,
  UserCog,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { ConfirmDialog } from '@/components/app/confirm';
import { LabCover } from '@/components/app/lab-photos';
import { SessionQuizzes } from '@/components/app/quiz-blocks';
import { RichText } from '@/components/app/rich-text';
import { SessionShareSheet, ShareButton } from '@/components/app/share-buttons';
import { EmptyState, IconTile, ListRow, RowDivider, RowGroup, StackedMeter, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { AttendancePill, LeavePill, SessionStatusPill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attendanceFor, leaveFor, sessionRoster, tally, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { exportErrorMessage, exportSessionRecap } from '@/lib/export';
import { formatDate, formatTime, formatTimeRange, relativeTime } from '@/lib/format';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, openSession, closeSession, updateSession, toast } = useStore();
  const me = useMe();
  const now = useNow(10_000);
  const [confirm, setConfirm] = useState<'open' | 'close' | 'cancel' | null>(null);
  const [sharing, setSharing] = useState(false);
  const raw = state.sessions.find((s) => s.id === id);

  if (!raw) {
    return (
      <Screen width="medium" header={<PageHeader title="Sesi" />}>
        <EmptyState icon={CalendarDays} title="Sesi tidak ditemukan" body="Mungkin sudah dihapus asisten." />
      </Screen>
    );
  }
  const s = viewSession(state, raw);
  const isStaff = me.role !== 'PRAKTIKAN' && (me.role === 'SUPERADMIN' || s.cls.assistantNims.includes(me.nim));
  const record = attendanceFor(state, s.id, me.nim);
  const leave = leaveFor(state, s.id, me.nim);
  const roster = isStaff ? sessionRoster(state, s) : [];
  const t = tally(roster.filter((r) => r.status).map((r) => ({ status: r.status! })), roster.length);

  return (
    <Screen
      width="medium"
      header={<PageHeader title={s.course.name} subtitle={`${s.cls.label} · ${s.course.code}`} right={<ShareButton onPress={() => setSharing(true)} />} />}
    >
      <SessionShareSheet sessionId={s.id} open={sharing} onOpenChange={setSharing} />
      <View className="gap-3">
        <View className="flex-row flex-wrap items-center gap-2">
          <SessionStatusPill status={s.status} />
          <Text className="text-muted-foreground text-sm">
            Pertemuan {s.meetingNo} dari {state.sessions.filter((x) => x.classId === s.classId).length}
          </Text>
        </View>
        <Text className="text-[26px] font-bold leading-8 tracking-tight">{s.topic}</Text>
      </View>

      {s.changeNote && s.status !== 'SELESAI' && (
        <View className="bg-warning-soft flex-row gap-3 rounded-2xl p-4">
          <Icon as={CircleExclamationPoint} className="text-warning-ink mt-0.5 size-5" />
          <View className="min-w-0 flex-1">
            <Text className="text-warning-ink text-sm font-semibold">{s.status === 'DIBATALKAN' ? 'Pertemuan dibatalkan' : 'Jadwal berubah'}</Text>
            <Text className="text-warning-ink text-[13px] leading-5">{s.changeNote}</Text>
          </View>
        </View>
      )}

      <View className="flex-row flex-wrap gap-3">
        <Info icon={CalendarDays} label="Tanggal" value={formatDate(s.startsAt, { weekday: true, short: true })} />
        <Info icon={Clock} label="Waktu" value={formatTimeRange(s.startsAt, s.endsAt)} />
        <Info icon={MapPin} label="Lab" value={`${s.lab.name.replace('Lab ', '')} · ${s.lab.code}`} onPress={() => router.push(`/lab/${s.lab.id}`)} />
        <Info icon={UserCog} label="Asisten" value={s.assistants.map((a) => a.name.split(' ')[0]).join(', ')} />
      </View>

      {/* Straight to the class: schedule, links (WhatsApp group…), all meetings. */}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/kelas/${s.cls.id}`)}
        className="bg-card border-border active:bg-accent flex-row items-center gap-3 rounded-2xl border p-3"
      >
        <IconTile icon={Users} size="sm" tone="brand" />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold" numberOfLines={1}>
            {s.course.name} · {s.cls.label}
          </Text>
          <Text className="text-muted-foreground text-xs">Detail kelas: jadwal, tautan grup, semua pertemuan</Text>
        </View>
        <Icon as={ChevronRight} className="text-muted-foreground size-4" />
      </Pressable>

      {/* Student status and actions */}
      {me.role === 'PRAKTIKAN' && (
        <Surface className="gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold">Status kamu</Text>
            {record ? <AttendancePill status={record.status} /> : leave ? <LeavePill decision={leave.decision} /> : <Text className="text-muted-foreground text-sm">Belum presensi</Text>}
          </View>
          {record && (
            <Text className="text-muted-foreground text-[13px]">
              Tercatat {formatTime(record.checkedInAt)} · {record.method === 'QR' ? 'QR + lokasi' : record.method === 'GEO' ? 'lokasi' : 'manual oleh asisten'}
              {record.distanceM !== undefined ? ` · ${record.distanceM} m dari lab` : ''}
            </Text>
          )}
          {!record && s.status === 'DIBUKA' && (
            <Button size="lg" className="h-12 rounded-2xl" onPress={() => router.push(`/presensi/${s.id}`)}>
              <Icon as={ScanLine} className="text-primary-foreground size-5" />
              <Text>Buka halaman presensi</Text>
            </Button>
          )}
          {!record && !leave && (s.status === 'TERJADWAL' || s.status === 'DIBUKA') && (
            <Button variant="outline" className="h-12 rounded-2xl" onPress={() => router.push({ pathname: '/izin/baru', params: { session: s.id } })}>
              <Icon as={FileText} className="size-4" />
              <Text>Ajukan izin untuk pertemuan ini</Text>
            </Button>
          )}
          {leave && (
            <Pressable onPress={() => router.push(`/izin/${leave.id}`)} className="bg-muted rounded-xl p-3">
              <Text className="text-[13px] font-medium">Izin{leave.category ? ` ${leave.category.toLowerCase()}` : ''} · {relativeTime(leave.submittedAt, now)}</Text>
              <Text className="text-muted-foreground text-[13px]" numberOfLines={2}>{leave.reason}</Text>
            </Pressable>
          )}
        </Surface>
      )}

      {/* Assistant controls */}
      {isStaff && (
        <Surface className="gap-4 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold">Kehadiran</Text>
            <Text className="text-muted-foreground text-sm">{t.HADIR + t.TERLAMBAT}/{roster.length} hadir</Text>
          </View>
          <StackedMeter parts={[{ value: t.HADIR, tone: 'success' }, { value: t.TERLAMBAT, tone: 'warning' }, { value: t.IZIN, tone: 'info' }, { value: t.ALPHA, tone: 'danger' }, { value: roster.length - t.HADIR - t.TERLAMBAT - t.IZIN - t.ALPHA, tone: 'neutral' }]} />
          <View className="flex-row flex-wrap gap-2">
            {s.status === 'TERJADWAL' && (
              <Button className="h-11 min-w-[45%] flex-1 rounded-xl" onPress={() => setConfirm('open')}>
                <Icon as={Play} className="text-primary-foreground size-4" />
                <Text>Buka sesi</Text>
              </Button>
            )}
            {s.status === 'DIBUKA' && (
              <>
                <Button className="h-11 min-w-[45%] flex-1 rounded-xl" onPress={() => router.push(`/qr/${s.id}`)}>
                  <Icon as={QrCode} className="text-primary-foreground size-4" />
                  <Text>Tampilkan QR</Text>
                </Button>
                <Button variant="destructive" className="h-11 min-w-[45%] flex-1 rounded-xl" onPress={() => setConfirm('close')}>
                  <Icon as={CircleStop} className="size-4 text-white" />
                  <Text>Tutup sesi</Text>
                </Button>
              </>
            )}
            <Button variant="outline" className="h-11 min-w-[45%] flex-1 rounded-xl" onPress={() => router.push(`/rekap/${s.id}`)}>
              <Icon as={Users} className="size-4" />
              <Text>Rekap</Text>
            </Button>
            <Button
              variant="outline"
              className="h-11 min-w-[45%] flex-1 rounded-xl"
              onPress={() => exportSessionRecap(state, s.id).then(() => toast({ title: 'File Excel siap', tone: 'success' })).catch((e) => toast({ title: exportErrorMessage(e), tone: 'danger' }))}
            >
              <Icon as={FileSpreadsheet} className="size-4" />
              <Text>Excel</Text>
            </Button>
          </View>
          {s.status !== 'DIBATALKAN' && (
            <View className="border-border flex-row gap-2 border-t pt-3">
              <Button variant="ghost" className="flex-1 rounded-xl" onPress={() => router.push(`/sesi/${s.id}/edit`)}>
                <Icon as={Pencil} className="size-4" />
                <Text>{s.status === 'TERJADWAL' ? 'Ubah pertemuan' : 'Ubah isi & materi'}</Text>
              </Button>
              {s.status === 'TERJADWAL' && (
                <Button variant="ghost" className="flex-1 rounded-xl" onPress={() => setConfirm('cancel')}>
                  <Icon as={Ban} className="text-destructive size-4" />
                  <Text className="text-destructive">Batalkan</Text>
                </Button>
              )}
            </View>
          )}
        </Surface>
      )}

      <SessionQuizzesSection sessionId={s.id} isStaff={isStaff} />

      <Section title="Keterangan">
        <Surface className="p-4">
          <RichText text={s.description} />
          <Text className="text-muted-foreground mt-3 text-[13px]">Terlambat jika presensi lebih dari {s.lateAfterMin} menit setelah mulai.</Text>
        </Surface>
      </Section>

      <Section title="Materi">
        {s.materials.length ? (
          <RowGroup>
            {s.materials.map((m, i) => (
              <View key={m.url}>
                {i > 0 && <RowDivider />}
                <ListRow title={m.label} subtitle={m.url.replace(/^https?:\/\//, '')} leading={<IconTile icon={BookOpen} size="sm" />} trailing={<Icon as={ExternalLink} className="text-muted-foreground size-4" />} chevron={false} onPress={() => Linking.openURL(m.url)} />
              </View>
            ))}
          </RowGroup>
        ) : (
          <Text className="text-muted-foreground text-sm">Belum ada materi.</Text>
        )}
      </Section>

      <Section title="Ruangan" action={<Pressable onPress={() => router.push(`/lab/${s.lab.id}`)} hitSlop={8}><Text className="text-primary text-sm font-semibold">Detail</Text></Pressable>}>
        <LabCover photos={s.lab.photos ?? []} name={s.lab.name} />
        <Surface className="gap-1 p-4">
          <Text className="text-[15px] font-semibold">{s.lab.name}</Text>
          <Text className="text-muted-foreground text-[13px]">
            {s.lab.building}, {s.lab.floor}
          </Text>
          {!!s.lab.directions && <Text className="pt-1 text-[13px] leading-5">{s.lab.directions}</Text>}
          {!s.lab.photos?.length && !s.lab.directions && (
            <Text className="text-muted-foreground pt-1 text-xs">Foto dan petunjuk arah ruangan belum diisi koordinator.</Text>
          )}
        </Surface>
      </Section>

      <ConfirmDialog
        open={confirm === 'open'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Buka sesi sekarang?"
        body={`${s.cls.studentNims.length} praktikan akan menerima notifikasi dan bisa presensi.`}
        confirmLabel="Buka sesi"
        onConfirm={() => {
          const n = openSession(s.id);
          toast({ title: 'Sesi dibuka', body: `Notifikasi push terkirim ke ${n} praktikan.`, tone: 'success' });
        }}
      />
      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Tutup sesi?"
        body="Yang belum presensi dicatat alpha, kecuali izinnya disetujui."
        confirmLabel="Tutup sesi"
        destructive
        onConfirm={() => closeSession(s.id)}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Batalkan pertemuan ini?"
        body="Praktikan akan menerima notifikasi pembatalan."
        confirmLabel="Batalkan pertemuan"
        destructive
        onConfirm={() => {
          const n = updateSession(s.id, { status: 'DIBATALKAN' }, 'Dibatalkan oleh asisten.');
          toast({ title: 'Pertemuan dibatalkan', body: `${n} praktikan diberi tahu.`, tone: 'success' });
        }}
      />
    </Screen>
  );
}

function SessionQuizzesSection({ sessionId, isStaff }: { sessionId: string; isStaff: boolean }) {
  const { state } = useStore();
  const visible = isStaff || state.quizzes.some((q) => q.sessionId === sessionId && q.status !== 'DRAFT');
  if (!visible) return null;
  return (
    <Section title="Kuis">
      <SessionQuizzes sessionId={sessionId} isStaff={isStaff} />
    </Section>
  );
}

function Info({ icon, label, value, onPress }: { icon: typeof Clock; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} className="bg-card border-border min-w-[45%] flex-1 flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-90">
      <IconTile icon={icon} size="sm" tone="neutral" />
      <View className="min-w-0 flex-1">
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <Text className="text-sm font-semibold" numberOfLines={1}>{value}</Text>
      </View>
    </Pressable>
  );
}
