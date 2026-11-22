import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { Camera, Keyboard, LocateFixed, X, Zap, ZapOff } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResultDialog } from '@/components/app/check-in-panel';
import { goBack } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { focusSessions, sessionsForUser, viewSession, type SessionView } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import type { CheckInMethod } from '@/data/types';
import { useLiveLocation } from '@/hooks/use-location';
import { useNow } from '@/hooks/use-now';
import type { CheckInVerdict } from '@/lib/attendance-rules';
import { cn } from '@/lib/utils';

export default function ScanScreen() {
  const params = useLocalSearchParams<{ session?: string }>();
  const { state, checkIn } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ verdict: CheckInVerdict; method: CheckInMethod; session: SessionView } | null>(null);
  const handled = useRef(false);

  const now = useNow(1000);
  const live = useMemo(() => focusSessions(sessionsForUser(state, me), now).live, [state, me, now]);
  const hinted = params.session ? state.sessions.find((s) => s.id === params.session) : undefined;
  const target = hinted ? viewSession(state, hinted) : live[0];
  const { state: loc } = useLiveLocation(target?.lab, !!target);
  const position = loc.status === 'ready' ? loc.position : null;

  const submit = (token: string) => {
    if (handled.current) return;
    const t = token.trim().toUpperCase();
    const fromToken = t.startsWith('LABSYNC:') ? t.split(':')[1]?.toLowerCase() : undefined;
    const sessionRaw = state.sessions.find((s) => s.id.toLowerCase() === fromToken) ?? hinted ?? live[0];
    if (!sessionRaw) return;
    handled.current = true;
    const session = viewSession(state, sessionRaw);
    checkIn({ sessionId: session.id, method: 'QR', position, qrToken: t.startsWith('LABSYNC:') ? token : t }).then(
      (verdict) => setResult({ verdict, method: 'QR', session }),
      () => {
        handled.current = false;
      },
    );
  };

  const granted = permission?.granted;

  return (
    <View className="flex-1 bg-black">
      {granted && !manual ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => submit(data)}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          {!manual && (
            <>
              <View className="size-16 items-center justify-center rounded-full bg-white/10">
                <Icon as={Camera} className="size-8 text-white" />
              </View>
              <Text className="text-center text-lg font-semibold text-white">Izinkan kamera untuk memindai QR</Text>
              <Text className="text-center text-sm leading-5 text-white/70">
                {permission && !permission.canAskAgain
                  ? 'Akses kamera ditolak. Buka pengaturan perangkat untuk mengizinkan, atau masukkan kode manual.'
                  : 'Kamera hanya dipakai di layar ini untuk membaca QR dari asisten.'}
              </Text>
              {(!permission || permission.canAskAgain) && (
                <Button className="rounded-full bg-white px-6" onPress={() => void requestPermission()}>
                  <Text className="text-black">Izinkan kamera</Text>
                </Button>
              )}
            </>
          )}
        </View>
      )}

      {/* Viewfinder */}
      {granted && !manual && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="size-64">
            {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-b-4 border-l-4 rounded-bl-3xl', 'right-0 bottom-0 border-b-4 border-r-4 rounded-br-3xl'].map((c) => (
              <View key={c} className={cn('absolute size-12 border-white', c)} />
            ))}
          </View>
          <Text className="mt-6 text-sm font-medium text-white">Arahkan ke QR di layar asisten</Text>
        </View>
      )}

      {/* Top bar */}
      <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={() => goBack()} className="size-11 items-center justify-center rounded-full bg-black/50">
          <Icon as={X} className="size-6 text-white" />
        </Pressable>
        <View className="flex-row items-center gap-2 rounded-full bg-black/50 px-3 py-2">
          <Icon as={LocateFixed} className={cn('size-4', position ? 'text-success' : 'text-white/60')} />
          <Text className="text-xs font-medium text-white">{position ? `Lokasi ± ${Math.round(position.accuracyM)} m` : 'Mencari lokasi…'}</Text>
        </View>
        {granted && Platform.OS !== 'web' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Senter" onPress={() => setTorch(!torch)} className="size-11 items-center justify-center rounded-full bg-black/50">
            <Icon as={torch ? ZapOff : Zap} className="size-5 text-white" />
          </Pressable>
        ) : (
          <View className="size-11" />
        )}
      </View>

      {/* Bottom sheet */}
      <KeyboardAvoidingView behavior="padding" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View className="bg-card w-full max-w-md gap-3 self-center rounded-t-3xl p-5" style={{ paddingBottom: insets.bottom + 20 }}>
          <View className="bg-border h-1 w-10 self-center rounded-full" />
          {target ? (
            <View className="gap-0.5">
              <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Presensi untuk</Text>
              <Text className="font-semibold" numberOfLines={1}>{target.course.name} · P{target.meetingNo}</Text>
            </View>
          ) : (
            <Text className="text-muted-foreground text-sm">Tidak ada sesi yang sedang dibuka untuk kelasmu.</Text>
          )}
          {manual ? (
            <View className="gap-2">
              <Input
                autoFocus
                placeholder="Kode 7 karakter, mis. 0K3XQ9A"
                autoCapitalize="characters"
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                onSubmitEditing={() => submit(code)}
                className="h-12 rounded-xl font-mono text-lg tracking-[4px]"
              />
              <Button className="h-12 rounded-xl" disabled={code.length < 7 || !target} onPress={() => submit(code)}>
                <Text>Kirim kode</Text>
              </Button>
            </View>
          ) : (
            <Button variant="outline" className="h-12 rounded-xl" onPress={() => setManual(true)}>
              <Icon as={Keyboard} className="size-4" />
              <Text>Masukkan kode manual</Text>
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>

      {result && (
        <ResultDialog
          result={result}
          session={result.session}
          onClose={() => {
            const ok = result.verdict.ok;
            setResult(null);
            handled.current = false;
            if (ok) goBack();
          }}
        />
      )}
    </View>
  );
}
