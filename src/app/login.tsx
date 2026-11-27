import { ArrowRight, CalendarDays, FileCheck2, Info, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/app/logo';
import { Mascot } from '@/components/app/mascot';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useStore } from '@/data/store';
import { useLayout } from '@/hooks/use-layout';

const ERRORS: Record<string, string> = {
  invalid_credentials: 'NIM/email atau kata sandi salah.',
  too_many_attempts: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  nim_taken: 'NIM ini sudah punya akun. Masuk saja, atau pakai Lupa sandi.',
  email_taken: 'Email ini sudah dipakai akun lain.',
  invalid_nim: 'NIM terdiri dari 8–20 digit angka.',
  invalid_email: 'Format email tidak valid.',
  weak_password: 'Kata sandi minimal 8 karakter.',
  invalid_name: 'Isi nama lengkap sesuai KTM.',
  server_not_configured: 'Server belum siap. Hubungi koordinator lab.',
  offline: 'Aplikasi belum tersambung ke server.',
  demo_mode: 'Mode demo: pendaftaran dimatikan. Pilih peran di bawah.',
};
const message = (e: unknown) => ERRORS[e instanceof Error ? e.message : ''] ?? 'Tidak bisa tersambung. Periksa internet lalu coba lagi.';

const FEATURES = [
  { icon: MapPin, label: 'Presensi di dalam radius lab' },
  { icon: CalendarDays, label: 'Jadwal dan pertemuan tiap kelas' },
  { icon: FileCheck2, label: 'Izin langsung ditinjau asisten' },
] as const;

const DEMO_ROLES = [
  { role: 'praktikan', label: 'Praktikan' },
  { role: 'asprak', label: 'Asprak' },
  { role: 'aslab', label: 'Aslab' },
] as const;

export default function LoginScreen() {
  const { login, register, resetPassword, demo } = useStore();
  const insets = useSafeAreaInsets();
  const { wide: tablet, split } = useLayout();
  // Two columns only when there is room side by side (landscape tablet, desktop).
  const wide = split;
  // Login: one field that takes a NIM/NIP or an email. Register (praktikan): NIM, name, email, password.
  const [identifier, setIdentifier] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');

  const submit = async () => {
    setInfo('');
    if (mode === 'login') {
      const id = identifier.trim();
      if (!id) return setError('Isi NIM/NIP atau email.');
      if (!id.includes('@') && !/^\d{8,20}$/.test(id)) return setError('NIM/NIP terdiri dari angka, atau pakai email.');
      if (password.length < 6 && !demo) return setError('Isi kata sandi.');
    } else {
      if (!/^\d{8,20}$/.test(nim.trim())) return setError(ERRORS.invalid_nim);
      if (name.trim().length < 3) return setError(ERRORS.invalid_name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(ERRORS.invalid_email);
      if (password.length < 8) return setError(ERRORS.weak_password);
    }
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(identifier, password);
      else await register({ nim: nim.trim(), name: name.trim(), email: email.trim(), password });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    const target = identifier.trim();
    if (!target.includes('@')) {
      setError('');
      setInfo('Ketik email akunmu di kolom pertama, lalu ketuk Lupa sandi lagi. Link atur ulang dikirim ke email itu.');
      return;
    }
    try {
      await resetPassword(target);
      setError('');
      setInfo(`Kalau email itu terdaftar, link atur ulang kata sandi sudah dikirim ke ${target}.`);
    } catch (e) {
      setError(message(e));
    }
  };

  const title = mode === 'login' ? 'Halo, praktikan!' : 'Gabung dulu yuk';
  const tagline = 'Jadwal, presensi berbasis lokasi, dan izin praktikum dalam satu aplikasi.';

  const hero = wide ? (
    <View className="bg-violet flex-1 justify-between overflow-hidden rounded-[40px] p-8">
      <View className="absolute -bottom-28 -left-24 size-96 rounded-full border-[44px] border-black/5" />
      <View className="absolute -right-16 -top-16 size-56 rounded-full border-[32px] border-white/5" />
      <View className="gap-3">
        <Text className="font-display text-[56px] font-extrabold uppercase leading-[54px] text-white">{title}</Text>
        <Text className="max-w-sm text-[17px] font-medium leading-6 text-white/85">{tagline}</Text>
      </View>
      <View className="flex-row items-end justify-between gap-4">
        <View className="min-w-0 flex-1 gap-2.5">
          {FEATURES.map((f) => (
            <View key={f.label} className="flex-row items-center gap-2.5">
              <View className="size-8 items-center justify-center rounded-full bg-white/15">
                <Icon as={f.icon} className="size-4 text-white" strokeWidth={2.4} />
              </View>
              <Text className="min-w-0 flex-1 text-sm font-semibold text-white">{f.label}</Text>
            </View>
          ))}
        </View>
        <Mascot mood="hello" size={190} />
      </View>
    </View>
  ) : (
    <View className="bg-violet overflow-hidden rounded-[32px] p-5">
      <View className="absolute -bottom-20 -left-16 size-60 rounded-full border-[28px] border-black/5" />
      <View className="flex-row items-end gap-1">
        <View className="min-w-0 flex-1 gap-2">
          <Text className="font-display text-[38px] font-extrabold uppercase leading-[38px] text-white">{title}</Text>
          <Text className="text-[15px] font-medium leading-5 text-white/85">{tagline}</Text>
        </View>
        <Mascot mood="hello" size={tablet ? 136 : 104} />
      </View>
    </View>
  );

  const form = (
    <View className="gap-4">
      {wide && (
        <View className="mb-1 gap-1">
          <Text className="font-display text-[28px] font-extrabold uppercase leading-8">{mode === 'login' ? 'Masuk' : 'Daftar akun'}</Text>
          <Text className="text-muted-foreground text-sm">{mode === 'login' ? 'Pakai NIM/NIP atau email, dan kata sandi akunmu.' : 'Khusus praktikan. Akun asisten dibuat koordinator.'}</Text>
        </View>
      )}
      {mode === 'login' ? (
        <View className="gap-2">
          <Label nativeID="id">NIM/NIP atau email</Label>
          <Input
            aria-labelledby="id"
            placeholder="24060124120001 atau nama@students.undip.ac.id"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="username"
          />
        </View>
      ) : (
        <>
          <View className="gap-2">
            <Label nativeID="nim">NIM</Label>
            <Input aria-labelledby="nim" placeholder="24060124120001" keyboardType="number-pad" value={nim} onChangeText={(v) => setNim(v.replace(/\D/g, ''))} />
          </View>
          <View className="gap-2">
            <Label nativeID="name">Nama lengkap</Label>
            <Input aria-labelledby="name" placeholder="Sesuai KTM" value={name} onChangeText={setName} autoComplete="name" />
          </View>
          <View className="gap-2">
            <Label nativeID="email">Email</Label>
            <Input
              aria-labelledby="email"
              placeholder="nama@students.undip.ac.id"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </>
      )}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label nativeID="pw">Kata sandi</Label>
          {mode === 'login' && (
            <Pressable accessibilityRole="button" onPress={forgot} hitSlop={8}>
              <Text className="text-primary text-sm font-medium">Lupa sandi?</Text>
            </Pressable>
          )}
        </View>
        <Input
          aria-labelledby="pw"
          placeholder={mode === 'register' ? 'Minimal 8 karakter' : '••••••••'}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
      </View>
      {!!error && <Text className="text-destructive text-sm">{error}</Text>}
      {!!info && <Text className="text-info-ink text-sm leading-5">{info}</Text>}
      <Button size="lg" disabled={busy} className="bg-ink active:bg-ink/90 justify-between pl-6 pr-1.5" onPress={submit}>
        <Text className="text-ink-foreground text-base">{busy ? 'Sebentar…' : mode === 'login' ? 'Masuk' : 'Daftar'}</Text>
        <View className="bg-coral size-11 items-center justify-center rounded-full">
          <Icon as={ArrowRight} className="text-on-bright size-5" strokeWidth={2.4} />
        </View>
      </Button>
      <Pressable
        onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
          setInfo('');
        }}
        className="items-center py-1"
      >
        <Text className="text-muted-foreground text-sm">
          {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <Text className="text-primary text-sm font-semibold">{mode === 'login' ? 'Daftar sebagai praktikan' : 'Masuk'}</Text>
        </Text>
      </Pressable>
    </View>
  );

  const demoLogin = async (role: 'praktikan' | 'asprak' | 'aslab') => {
    setError('');
    setBusy(true);
    try {
      await login(role, '');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const note = demo ? (
    <View className="bg-card gap-3 rounded-2xl border border-border p-3.5">
      <View className="flex-row gap-2.5">
        <Icon as={Info} className="text-muted-foreground mt-0.5 size-4" />
        <Text className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
          Mode demo: data contoh di perangkat ini, tidak tersimpan. Kata sandi apa saja bisa dipakai, atau langsung pilih peran.
        </Text>
      </View>
      <View className="flex-row gap-2">
        {DEMO_ROLES.map((r) => (
          <Button key={r.role} variant="outline" size="sm" className="flex-1" disabled={busy} onPress={() => demoLogin(r.role)}>
            <Text className="text-xs">{r.label}</Text>
          </Button>
        ))}
      </View>
    </View>
  ) : (
    <View className="bg-muted flex-row gap-2.5 rounded-2xl p-3.5">
      <Icon as={Info} className="text-muted-foreground mt-0.5 size-4" />
      <Text className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
        Praktikan daftar sendiri dengan NIM. Akun asisten dan koordinator dibuat koordinator lab; link atur kata sandi dikirim ke email kalian.
      </Text>
    </View>
  );

  return (
    <View className="bg-background flex-1">
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        {wide ? (
          // Tablet / desktop: hero fills the left half, form column on the right.
          <View className="w-full max-w-[1080px] flex-1 flex-row gap-10 self-center px-8" style={{ minHeight: 560 }}>
            <View className="flex-1 gap-5">
              <Logo size="lg" />
              {hero}
            </View>
            <View className="w-[400px] justify-center gap-8">
              {form}
              {note}
            </View>
          </View>
        ) : (
          <View className={tablet ? 'w-full max-w-lg flex-1 justify-center gap-10 self-center px-8' : 'w-full max-w-md flex-1 justify-center gap-8 self-center px-5'}>
            <View className="gap-5">
              <Logo size="lg" />
              {hero}
            </View>
            {form}
            {note}
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
