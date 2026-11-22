import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, FileText, Paperclip, Sparkles, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section, goBack } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { attendanceFor, leaveFor, sessionsForUser } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { formatTimeRange, relativeDay } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function NewLeave() {
  const params = useLocalSearchParams<{ session?: string }>();
  const { state, submitLeave } = useStore();
  const me = useMe();
  const now = useNow(60_000);
  const options = useMemo(
    () =>
      sessionsForUser(state, me)
        .filter((s) => (s.status === 'TERJADWAL' || s.status === 'DIBUKA') && s.endsAt > now)
        .filter((s) => !attendanceFor(state, s.id, me.nim) && !leaveFor(state, s.id, me.nim))
        .slice(0, 8),
    [state, me, now],
  );
  const [sessionId, setSessionId] = useState(params.session ?? options[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);

  const submit = () => {
    if (!sessionId) return setError('Pilih pertemuan yang ingin kamu izinkan.');
    if (reason.trim().length < 15) return setError('Tulis alasan minimal 15 karakter agar asisten bisa menilai.');
    setError('');
    submitLeave({ sessionId, reason: reason.trim(), attachmentName: attachment }).then(setDoneId, () => undefined);
  };

  if (doneId) {
    return (
      <Screen header={<PageHeader title="Izin terkirim" back={false} />}>
        <Surface className="items-center gap-4 px-6 py-10">
          <View className="bg-success-soft size-20 items-center justify-center rounded-full">
            <Icon as={CircleCheck} className="text-success size-10" />
          </View>
          <Text className="text-center text-xl font-bold">Izin terkirim ke asisten</Text>
          <Text className="text-muted-foreground text-center text-sm leading-5">
            AI sudah mengategorikan alasanmu untuk asisten. Kamu akan dapat notifikasi saat izin disetujui atau ditolak.
          </Text>
          <View className="w-full gap-2 pt-2">
            <Button className="h-12 rounded-2xl" onPress={() => router.replace(`/izin/${doneId}`)}>
              <Text>Lihat status izin</Text>
            </Button>
            <Button variant="ghost" onPress={() => goBack()}>
              <Text>Kembali</Text>
            </Button>
          </View>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen header={<PageHeader title="Ajukan izin" subtitle="Ditinjau oleh asisten kelas" />}>
        <Section title="Pertemuan">
          {options.length === 0 ? (
            <Surface><EmptyState icon={FileText} title="Tidak ada pertemuan yang bisa diizinkan" body="Izin hanya untuk pertemuan yang belum selesai dan belum kamu hadiri." /></Surface>
          ) : (
            <View className="gap-2">
              {options.map((s) => {
                const active = s.id === sessionId;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => setSessionId(s.id)}
                    className={cn('flex-row items-center gap-3 rounded-2xl border p-3.5', active ? 'border-primary bg-brand-soft' : 'border-border bg-card active:bg-accent')}
                  >
                    <View className={cn('size-5 items-center justify-center rounded-full border-2', active ? 'border-primary' : 'border-input')}>
                      {active && <View className="bg-primary size-2.5 rounded-full" />}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold" numberOfLines={1}>{s.course.name} · P{s.meetingNo}</Text>
                      <Text className="text-muted-foreground text-xs">{relativeDay(s.startsAt, now)}, {formatTimeRange(s.startsAt, s.endsAt)} · {s.topic}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Section>

        <Section title="Alasan">
          <Textarea
            placeholder="Contoh: demam sejak semalam, sudah periksa ke klinik kampus dan disarankan istirahat 2 hari."
            value={reason}
            onChangeText={setReason}
            className="min-h-32 rounded-2xl"
            maxLength={600}
          />
          <View className="flex-row items-center justify-between">
            <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
              <Icon as={Sparkles} className="text-primary size-3.5" />
              <Text className="text-muted-foreground min-w-0 flex-1 text-xs">
                Kategori (sakit, keluarga, akademik, kendala) dipilih AI dari alasanmu. Keputusan tetap di asisten.
              </Text>
            </View>
            <Text className="text-muted-foreground text-xs">{reason.length}/600</Text>
          </View>
        </Section>

        <Section title="Lampiran (opsional)">
          {attachment ? (
            <View className="bg-card border-border flex-row items-center gap-3 rounded-2xl border p-3">
              <Icon as={Paperclip} className="text-muted-foreground size-4" />
              <Text className="min-w-0 flex-1 text-sm" numberOfLines={1}>{attachment}</Text>
              <Pressable accessibilityLabel="Hapus lampiran" onPress={() => setAttachment(undefined)}>
                <Icon as={X} className="text-muted-foreground size-4" />
              </Pressable>
            </View>
          ) : (
            <Button variant="outline" className="h-12 rounded-2xl border-dashed" onPress={() => setAttachment('bukti-pendukung.pdf')}>
              <Icon as={Paperclip} className="size-4" />
              <Text>Tambah foto atau PDF</Text>
            </Button>
          )}
        </Section>

        {!!error && <Text className="text-destructive text-sm">{error}</Text>}
        <Button size="lg" className="h-14 rounded-2xl" onPress={submit} disabled={!options.length}>
          <Text className="text-base font-bold">Kirim izin</Text>
        </Button>
    </Screen>
  );
}
