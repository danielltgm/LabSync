import { router } from 'expo-router';
import { CircleStop, Maximize2, ShieldCheck, Users } from 'lucide-react-native';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar, Meter, Surface } from '@/components/app/primitives';
import { AttendancePill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { userByNim, type SessionView } from '@/data/selectors';
import { useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { createQrToken, QR_ROTATE_MS, shortCode } from '@/lib/attendance-rules';
import { countdown, formatTime, relativeTime } from '@/lib/format';

/** Rotating QR for the assistant's screen. Tokens expire every 15 s so photos of the code are useless. */
export function QrPanel({ session, big = false }: { session: SessionView; big?: boolean }) {
  const { state } = useStore();
  const now = useNow(250);
  // Staff read the session's secret from sessionSecrets (created when the session opens).
  const secret = state.qrSecrets[session.id] ?? '';
  const token = secret ? createQrToken(session.id, now, secret) : '';
  const elapsed = now % QR_ROTATE_MS;
  const remaining = Math.ceil((QR_ROTATE_MS - elapsed) / 1000);
  const records = state.attendance.filter((a) => a.sessionId === session.id).sort((a, b) => b.checkedInAt - a.checkedInAt);
  const present = records.filter((r) => r.status === 'HADIR' || r.status === 'TERLAMBAT').length;
  const total = session.cls.studentNims.length;
  const size = big ? 300 : 232;

  return (
    <View className="gap-4">
      <Surface className="items-center gap-4 px-5 pb-5 pt-6">
        <View className="items-center gap-0.5">
          <Text className="text-muted-foreground text-[13px] font-medium">{session.course.name} · {session.cls.label}</Text>
          <Text className="text-center text-lg font-bold">P{session.meetingNo} · {session.topic}</Text>
        </View>
        <View className="rounded-3xl bg-white p-4">
          {token ? (
            <QRCode value={token} size={size} color="#111427" backgroundColor="#FFFFFF" ecl="M" />
          ) : (
            // The secret arrives with the staff subscriptions; QRCode throws on an empty value.
            <View className="items-center justify-center" style={{ width: size, height: size }}>
              <Text className="text-muted-foreground text-center text-sm">Menyiapkan kode QR…</Text>
            </View>
          )}
        </View>
        <View className="w-full max-w-xs gap-2">
          <Meter value={((QR_ROTATE_MS - elapsed) / QR_ROTATE_MS) * 100} tone={remaining <= 3 ? 'warning' : 'brand'} />
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-xs">Kode berganti dalam {remaining} dtk</Text>
            <Text className="font-mono text-sm font-bold tracking-[3px]">{shortCode(token)}</Text>
          </View>
        </View>
        <View className="bg-muted w-full flex-row items-center gap-2 rounded-2xl px-3 py-2.5">
          <Icon as={ShieldCheck} className="text-muted-foreground size-4" />
          <Text className="text-muted-foreground min-w-0 flex-1 text-xs leading-4">
            Praktikan tetap harus berada dalam radius {session.lab.radiusM} m dari {session.lab.name}.
          </Text>
        </View>
      </Surface>

      <Surface className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon as={Users} className="size-4" />
            <Text className="font-semibold">{present}/{total} hadir</Text>
          </View>
          <Text className="text-muted-foreground text-xs" style={{ fontVariant: ['tabular-nums'] }}>
            sesi berakhir {countdown(session.endsAt, now)}
          </Text>
        </View>
        <Meter value={(present / total) * 100} tone="success" />
        {records.slice(0, 4).map((r) => {
          const u = userByNim(state, r.nim);
          return (
            <View key={r.id} className="flex-row items-center gap-3">
              <Avatar name={u?.name ?? r.nim} size="sm" />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-medium" numberOfLines={1}>{u?.name}</Text>
                <Text className="text-muted-foreground text-xs">{formatTime(r.checkedInAt)} · {r.method === 'QR' ? 'QR' : 'Lokasi'}{r.distanceM !== undefined ? ` · ${r.distanceM} m` : ''} · {relativeTime(r.checkedInAt, now)}</Text>
              </View>
              <AttendancePill status={r.status} />
            </View>
          );
        })}
        <View className="flex-row gap-2 pt-1">
          <Button variant="outline" className="flex-1 rounded-xl" onPress={() => router.push(`/rekap/${session.id}`)}>
            <Icon as={Users} className="size-4" />
            <Text>Rekap live</Text>
          </Button>
          {!big && (
            <Button variant="outline" className="flex-1 rounded-xl" onPress={() => router.push(`/qr/${session.id}`)}>
              <Icon as={Maximize2} className="size-4" />
              <Text>Layar penuh</Text>
            </Button>
          )}
        </View>
      </Surface>
    </View>
  );
}

export function CloseSessionButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="destructive" className="h-12 rounded-2xl" onPress={onPress}>
      <Icon as={CircleStop} className="size-5 text-white" />
      <Text>Tutup sesi</Text>
    </Button>
  );
}
