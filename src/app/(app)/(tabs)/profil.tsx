import { router } from 'expo-router';
import {
  Bell,
  BellOff,
  Building,
  Copy,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  History,
  LayoutGrid,
  LocateFixed,
  LogOut,
  Mail,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ConfirmDialog } from '@/components/app/confirm';
import { DemoLocationPicker } from '@/components/app/demo-location';
import { BarPlacementPicker, NavCustomizer, ROLE_STYLE } from '@/components/app/nav-customizer';
import { useLayout } from '@/hooks/use-layout';
import { Mascot } from '@/components/app/mascot';
import { Avatar, Columns, IconTile, ListRow, Meter, RowDivider, RowGroup, Segmented, Surface } from '@/components/app/primitives';
import { Screen, Section } from '@/components/app/screen';
import { Pill } from '@/components/app/status';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { SLOT_META, useNavSlots } from '@/data/nav';
import { classesForUser, studentStats } from '@/data/selectors';
import { useMe, useStore, useUnreadCount } from '@/data/store';
import { setPrefs, usePrefs } from '@/hooks/use-prefs';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const ROLE_LABEL = { PRAKTIKAN: 'Praktikan', ASISTEN: 'Asisten', SUPERADMIN: 'Koordinator lab' } as const;

export default function ProfileScreen() {
  const { state, logout, toast } = useStore();
  const me = useMe();
  const unread = useUnreadCount();
  const theme = useThemePreference();
  const prefs = usePrefs();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const classes = useMemo(() => classesForUser(state, me), [state, me]);
  const stats = useMemo(() => (me.role === 'PRAKTIKAN' ? studentStats(state, me.nim) : null), [state, me]);
  const [customizing, setCustomizing] = useState(false);
  const slots = useNavSlots();
  const { wide } = useLayout();

  return (
    <Screen tabs>
      {/* Wide screens: identity and activity on the left, settings on the right. Phones stack them. */}
      <Columns
        main={
          <>
            <Surface className="bg-ink gap-4 overflow-hidden p-5">
              <View className="absolute -right-20 -top-20 size-64 rounded-full border-[30px] border-white/5" />
              <View className="flex-row items-start justify-between">
                <Avatar name={me.name} size="xl" />
                <Mascot mood="front" size={80} />
              </View>
              <View className="gap-1">
                <Text className="text-ink-foreground font-display text-[40px] font-extrabold uppercase leading-[40px]">{me.name}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Salin NIM"
                  onPress={() => {
                    void Clipboard.setStringAsync(me.nim);
                    toast({ title: 'NIM disalin', tone: 'success' });
                  }}
                  className="flex-row items-center gap-1.5 self-start"
                >
                  <Text className="text-mustard font-mono text-sm font-bold">NIM {me.nim}</Text>
                  <Icon as={Copy} className="text-mustard size-3.5" />
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <View className={cn('rounded-full px-3 py-1.5', ROLE_STYLE[me.role].bg)}>
                  <Text className={cn('font-mono text-[11px] font-bold uppercase', ROLE_STYLE[me.role].fg)}>{ROLE_LABEL[me.role]}</Text>
                </View>
                {me.angkatan && (
                  <View className="rounded-full bg-white/10 px-3 py-1.5">
                    <Text className="text-ink-foreground font-mono text-[11px] font-bold">Angkatan {me.angkatan}</Text>
                  </View>
                )}
                <View className="rounded-full bg-white/10 px-3 py-1.5">
                  <Text className="text-ink-foreground font-mono text-[11px] font-bold">{classes.length} kelas</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Icon as={Mail} className="text-ink-muted size-3.5" />
                <Text className="text-ink-muted text-[13px]">{me.email}</Text>
              </View>
            </Surface>

            {stats && (
              <Section title="Kehadiranku">
                <Surface className="gap-4 p-4">
                  {stats.perClass.map((p) => (
                    <View key={p.cls.id} className="gap-1.5">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="min-w-0 flex-1 text-sm font-semibold" numberOfLines={1}>
                          {p.course.name}
                        </Text>
                        <Text
                          className={cn('font-display text-xl font-extrabold', p.tally.rate < 80 ? 'text-warning-ink' : 'text-foreground')}
                        >
                          {p.tally.rate}%
                        </Text>
                      </View>
                      <Meter value={p.tally.rate} tone={p.tally.rate < 75 ? 'danger' : p.tally.rate < 80 ? 'warning' : 'brand'} />
                    </View>
                  ))}
                </Surface>
              </Section>
            )}

            <Section title="Aktivitas">
              <RowGroup>
                <ListRow
                  title="Notifikasi"
                  subtitle={unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
                  leading={<IconTile icon={Bell} size="sm" />}
                  onPress={() => router.push('/notifikasi')}
                />
                {me.role === 'PRAKTIKAN' && (
                  <>
                    <RowDivider />
                    <ListRow
                      title="Riwayat presensi"
                      leading={<IconTile icon={RotateCcw} tone="success" size="sm" />}
                      onPress={() => router.push('/riwayat')}
                    />
                    <RowDivider />
                    <ListRow
                      title="Pengajuan izin"
                      leading={<IconTile icon={FileText} tone="warning" size="sm" />}
                      onPress={() => router.push('/izin')}
                    />
                  </>
                )}
                {me.role === 'ASISTEN' && (
                  <>
                    <RowDivider />
                    <ListRow
                      title="Kelas & praktikan"
                      leading={<IconTile icon={Users} size="sm" />}
                      onPress={() => router.push('/kelas')}
                    />
                    <RowDivider />
                    <ListRow
                      title="Tinjau izin"
                      leading={<IconTile icon={FileText} tone="warning" size="sm" />}
                      onPress={() => router.push('/izin')}
                    />
                    <RowDivider />
                    <ListRow
                      title="Lokasi & radius lab"
                      leading={<IconTile icon={Building} tone="info" size="sm" />}
                      onPress={() => router.push('/lab')}
                    />
                    <RowDivider />
                    <ListRow
                      title="Export rekap Excel"
                      leading={<IconTile icon={FileSpreadsheet} tone="success" size="sm" />}
                      onPress={() => router.push('/kelas')}
                    />
                  </>
                )}
                {me.role !== 'PRAKTIKAN' && (
                  <>
                    <RowDivider />
                    <ListRow
                      title="Log perubahan"
                      subtitle={me.role === 'SUPERADMIN' ? 'Semua perubahan di semua kelas' : 'Perubahan di kelasmu'}
                      leading={<IconTile icon={History} tone="neutral" size="sm" />}
                      onPress={() => router.push('/log')}
                    />
                  </>
                )}
                {me.role === 'SUPERADMIN' && (
                  <>
                    <RowDivider />
                    <ListRow
                      title="Konsol koordinator"
                      subtitle="Pengguna, peran, penugasan asisten"
                      leading={<IconTile icon={ShieldCheck} size="sm" />}
                      onPress={() => router.push('/admin')}
                    />
                    <RowDivider />
                    <ListRow
                      title="Lokasi & radius lab"
                      leading={<IconTile icon={Building} tone="info" size="sm" />}
                      onPress={() => router.push('/lab')}
                    />
                    <RowDivider />
                    <ListRow
                      title="Semua kelas"
                      leading={<IconTile icon={GraduationCap} tone="success" size="sm" />}
                      onPress={() => router.push('/kelas')}
                    />
                  </>
                )}
              </RowGroup>
            </Section>
          </>
        }
        side={
          <>
            <Section title="Bottom bar">
              <RowGroup>
                <ListRow
                  title="Atur bottom bar"
                  subtitle={`Beranda · ${slots.map((s) => SLOT_META[s].label).join(' · ')} · Profil`}
                  leading={<IconTile icon={LayoutGrid} tone="brand" size="sm" />}
                  onPress={() => setCustomizing(true)}
                />
              </RowGroup>
              <BarPlacementPicker value={prefs.barPlacement} onChange={(v) => setPrefs({ barPlacement: v })} wide={wide} />
              <NavCustomizer open={customizing} onOpenChange={setCustomizing} />
            </Section>

            <Section title="Tampilan">
              <Segmented<ThemePreference>
                value={theme}
                onChange={setThemePreference}
                options={[
                  { value: 'system', label: 'Sistem' },
                  { value: 'light', label: 'Terang' },
                  { value: 'dark', label: 'Gelap' },
                ]}
              />
            </Section>

            <Section title="Notifikasi & izin perangkat">
              <RowGroup>
                <ListRow
                  title="Push notification"
                  subtitle={
                    prefs.push === 'granted'
                      ? 'Aktif di perangkat ini'
                      : prefs.push === 'denied'
                        ? 'Ditolak. Pemberitahuan tetap masuk ke kotak notifikasi.'
                        : 'Belum diizinkan'
                  }
                  leading={
                    <IconTile
                      icon={prefs.push === 'granted' ? Bell : BellOff}
                      tone={prefs.push === 'granted' ? 'success' : 'danger'}
                      size="sm"
                    />
                  }
                  trailing={
                    <Switch checked={prefs.push === 'granted'} onCheckedChange={(on) => setPrefs({ push: on ? 'granted' : 'denied' })} />
                  }
                  chevron={false}
                />
                <RowDivider />
                <ToggleRow label="Sesi dibuka" checked={prefs.notifySessionOpened} onChange={(v) => setPrefs({ notifySessionOpened: v })} />
                <RowDivider />
                <ToggleRow label="Perubahan jadwal" checked={prefs.notifySchedule} onChange={(v) => setPrefs({ notifySchedule: v })} />
                <RowDivider />
                <ToggleRow label="Keputusan izin" checked={prefs.notifyLeave} onChange={(v) => setPrefs({ notifyLeave: v })} />
                <RowDivider />
                <View className="gap-2 px-4 py-3">
                  <Text className="text-[15px] font-medium">Pengingat sebelum sesi</Text>
                  <Segmented
                    value={String(prefs.reminderMin)}
                    onChange={(v) => setPrefs({ reminderMin: Number(v) as 0 | 15 | 30 | 60 })}
                    options={[
                      { value: '0', label: 'Mati' },
                      { value: '15', label: '15 mnt' },
                      { value: '30', label: '30 mnt' },
                      { value: '60', label: '1 jam' },
                    ]}
                  />
                </View>
                <RowDivider />
                <ListRow
                  title="Akses lokasi"
                  subtitle="Dipakai hanya saat halaman presensi dan peta dibuka"
                  leading={<IconTile icon={LocateFixed} tone="info" size="sm" />}
                  chevron={false}
                  trailing={<Pill tone="success" label="Saat dipakai" />}
                />
              </RowGroup>
            </Section>

            {/* Location simulation is a development aid only; release builds always use real GPS. */}
            {__DEV__ && (
              <Section title="Pengembangan">
                <DemoLocationPicker />
              </Section>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmLogout(true)}
              className="bg-coral h-14 flex-row items-center justify-center gap-2 rounded-full active:opacity-90"
            >
              <Icon as={LogOut} className="text-on-bright size-5" strokeWidth={2.4} />
              <Text className="text-on-bright text-base font-bold">Keluar</Text>
            </Pressable>
            <Text className="text-muted-foreground text-center text-xs">LabSync · Sprint 3</Text>
          </>
        }
      />

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Keluar dari LabSync?"
        body="Kamu perlu masuk lagi dengan NIM/email dan kata sandi."
        confirmLabel="Keluar"
        destructive
        onConfirm={() => void logout()}
      />
    </Screen>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="min-h-12 flex-row items-center gap-3 px-4 py-2.5">
      <Text className="min-w-0 flex-1 text-[15px]">{label}</Text>
      <Switch checked={checked} onCheckedChange={onChange} />
    </View>
  );
}
