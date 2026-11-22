import { router, useLocalSearchParams } from 'expo-router';
import { Crosshair, Hand, Info, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ConfirmDialog, useConfirm } from '@/components/app/confirm';
import { LabPhotoEditor } from '@/components/app/lab-photos';
import { Chip, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section, goBack } from '@/components/app/screen';
import { Stepper } from '@/components/app/session-form';
import { LabMap } from '@/components/map/lab-map';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { GEDUNG_E } from '@/data/demo-seed';
import { labDiff } from '@/data/selectors';
import { useStore } from '@/data/store';
import type { Lab } from '@/data/types';
import { useLiveLocation } from '@/hooks/use-location';
import { useColors } from '@/hooks/use-theme';

export default function EditLab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, saveLab, deleteLab, toast } = useStore();
  const { scheme } = useColors();
  const existing = state.labs.find((l) => l.id === id);
  const isNew = !existing;
  const [lab, setLab] = useState<Lab>(
    () =>
      existing ?? {
        id: `lab-${Date.now().toString(36)}`,
        code: '',
        name: '',
        building: 'Gedung E FSM UNDIP',
        floor: 'Lantai 2',
        ...(state.labs[0] ? { lat: state.labs[0].lat, lng: state.labs[0].lng } : GEDUNG_E),
        radiusM: 45,
        maxAccuracyM: 40,
        capacity: 40,
        facilities: [],
        photos: [],
      },
  );
  const [focusKey, setFocusKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [facility, setFacility] = useState('');
  const { confirm, dialog } = useConfirm();
  // Rooms sharing this exact point (B, C, D all use the Gedung E reference).
  const sharing = state.labs.filter((l) => l.id !== lab.id && l.lat === lab.lat && l.lng === lab.lng);
  const { state: loc } = useLiveLocation(existing ?? state.labs[0]);
  const set = <K extends keyof Lab>(k: K, v: Lab[K]) => setLab((l) => ({ ...l, [k]: v }));
  const usedBy = state.sessions.filter((s) => s.labId === lab.id && s.status !== 'SELESAI').length;

  const useMyLocation = () => {
    if (loc.status !== 'ready') {
      toast({ title: 'Lokasi belum tersedia', body: 'Aktifkan GPS lalu tunggu beberapa detik.', tone: 'danger' });
      return;
    }
    setLab((l) => ({ ...l, lat: loc.position.lat, lng: loc.position.lng }));
    setFocusKey((k) => k + 1);
    toast({ title: 'Titik lab dipindah ke lokasimu', body: `Akurasi ± ${Math.round(loc.position.accuracyM)} m`, tone: 'success' });
  };

  const save = () => {
    if (lab.name.trim().length < 3 || !lab.code.trim()) return setError('Isi nama dan kode ruang.');
    setError('');
    const next = { ...lab, name: lab.name.trim(), code: lab.code.trim().toUpperCase(), directions: lab.directions?.trim() || undefined };
    const write = () => {
      saveLab(next);
      toast({ title: isNew ? 'Lab ditambahkan' : 'Ruangan disimpan', body: `Radius ${next.radiusM} m langsung berlaku untuk presensi.`, tone: 'success' });
      goBack();
    };
    if (isNew) return write();
    const changes = labDiff(existing, next);
    if (!changes.length) return toast({ title: 'Tidak ada yang berubah' });
    confirm({ title: `Simpan ${changes.length} perubahan?`, body: 'Perubahan tercatat di log dan langsung berlaku untuk presensi.', confirmLabel: 'Simpan', changes, onConfirm: write });
  };
  const addFacility = () => {
    const f = facility.trim();
    if (f && !lab.facilities.includes(f)) set('facilities', [...lab.facilities, f]);
    setFacility('');
  };

  return (
    <Screen header={<PageHeader title={isNew ? 'Tambah lab' : 'Atur ruangan'} subtitle={existing?.name ?? 'Lab baru'} />}>
      <View className="border-border h-80 overflow-hidden rounded-3xl border">
        <LabMap
          labs={[]}
          editing={{ lat: lab.lat, lng: lab.lng, radiusM: lab.radiusM, onMove: (p) => setLab((l) => ({ ...l, ...p })) }}
          user={loc.status === 'ready' ? loc.position : null}
          focus={{ lat: lab.lat, lng: lab.lng, zoom: 19 }}
          focusKey={focusKey}
          dark={scheme === 'dark'}
        />
      </View>
      <View className="flex-row items-center gap-2">
        <Icon as={Hand} className="text-muted-foreground size-4" />
        <Text className="text-muted-foreground min-w-0 flex-1 text-xs">Ketuk peta atau geser pin untuk memindah titik lab.</Text>
      </View>
      <Button variant="outline" className="h-12 rounded-2xl" onPress={useMyLocation}>
        <Icon as={Crosshair} className="size-4" />
        <Text>Pakai lokasi saya sekarang</Text>
      </Button>
      {sharing.length > 0 && (
        <View className="bg-warning-soft flex-row gap-2 rounded-2xl p-3">
          <Icon as={Info} className="text-warning-ink mt-0.5 size-4" />
          <Text className="text-warning-ink min-w-0 flex-1 text-xs leading-5">
            Titik ini sama dengan {sharing.map((l) => l.name).join(', ')} (patokan gedung). GPS hanya memastikan praktikan ada di gedung, bukan di
            ruangan yang tepat. Pakai QR di ruangan untuk memastikan ruangannya.
          </Text>
        </View>
      )}

      <Section title="Radius presensi">
        <Surface className="gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold">{lab.radiusM} m</Text>
              <Text className="text-muted-foreground text-xs">dari titik pusat lab</Text>
            </View>
            <Stepper value={lab.radiusM} onChange={(v) => set('radiusM', v)} min={10} max={300} />
          </View>
          <View className="flex-row flex-wrap gap-2">
            {[20, 30, 40, 50, 75, 100].map((r) => (
              <Chip key={r} label={`${r} m`} active={lab.radiusM === r} onPress={() => set('radiusM', r)} />
            ))}
          </View>
          <View className="bg-muted flex-row gap-2 rounded-xl p-3">
            <Icon as={Info} className="text-muted-foreground mt-0.5 size-4" />
            <Text className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
              GPS di dalam gedung bisa meleset 10–30 m. Radius 30–50 m biasanya cukup untuk satu ruang lab.
            </Text>
          </View>
        </Surface>
      </Section>

      <Section title="Akurasi GPS minimum">
        <View className="flex-row flex-wrap gap-2">
          {[20, 35, 50, 75].map((a) => (
            <Chip key={a} label={`± ${a} m`} active={lab.maxAccuracyM === a} onPress={() => set('maxAccuracyM', a)} />
          ))}
        </View>
        <Text className="text-muted-foreground text-xs">Presensi ditolak jika akurasi lokasi perangkat lebih buruk dari nilai ini.</Text>
      </Section>

      <Section title="Foto ruangan">
        <LabPhotoEditor photos={lab.photos} onChange={(p) => set('photos', p)} />
      </Section>

      <Section title="Petunjuk arah">
        <Textarea
          placeholder="Contoh: Gedung E lantai 2, dari tangga utara belok kanan, pintu ketiga."
          value={lab.directions ?? ''}
          onChangeText={(v) => set('directions', v)}
          className="min-h-20"
        />
      </Section>

      <Section title="Info ruang">
        <View className="flex-row gap-3">
          <View className="w-28 gap-2">
            <Label nativeID="code">Kode</Label>
            <Input aria-labelledby="code" value={lab.code} onChangeText={(v) => set('code', v)} placeholder="B" autoCapitalize="characters" />
          </View>
          <View className="flex-1 gap-2">
            <Label nativeID="name">Nama lab</Label>
            <Input aria-labelledby="name" value={lab.name} onChangeText={(v) => set('name', v)} placeholder="Lab Informatika B" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label nativeID="b">Gedung</Label>
            <Input aria-labelledby="b" value={lab.building} onChangeText={(v) => set('building', v)} />
          </View>
          <View className="w-32 gap-2">
            <Label nativeID="f">Lantai</Label>
            <Input aria-labelledby="f" value={lab.floor} onChangeText={(v) => set('floor', v)} />
          </View>
        </View>
        <View className="gap-2">
          <Label nativeID="cap">Kapasitas</Label>
          <Input aria-labelledby="cap" keyboardType="number-pad" value={String(lab.capacity)} onChangeText={(v) => set('capacity', Number(v.replace(/\D/g, '')) || 0)} />
        </View>
        <View className="gap-2">
          <Label nativeID="fac">Fasilitas</Label>
          {lab.facilities.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {lab.facilities.map((f) => (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityLabel={`Hapus ${f}`}
                  onPress={() => set('facilities', lab.facilities.filter((x) => x !== f))}
                  className="bg-muted active:bg-accent flex-row items-center gap-1.5 rounded-full py-2 pl-3.5 pr-2.5"
                >
                  <Text className="text-sm font-medium">{f}</Text>
                  <Icon as={X} className="text-muted-foreground size-3.5" />
                </Pressable>
              ))}
            </View>
          )}
          <View className="flex-row gap-2">
            <Input
              aria-labelledby="fac"
              className="flex-1"
              value={facility}
              onChangeText={setFacility}
              placeholder="Contoh: 40 PC, Proyektor, AC"
              submitBehavior="submit"
              onSubmitEditing={addFacility}
            />
            <Button variant="outline" className="size-12 rounded-2xl p-0" onPress={addFacility} accessibilityLabel="Tambah fasilitas">
              <Icon as={Plus} className="size-5" />
            </Button>
          </View>
        </View>
        <Text className="text-muted-foreground text-xs">Koordinat: {lab.lat.toFixed(6)}, {lab.lng.toFixed(6)}</Text>
      </Section>

      {!!error && <Text className="text-destructive text-sm">{error}</Text>}
      <Button size="lg" className="h-14 rounded-2xl" onPress={save}>
        <Text className="text-base font-bold">{isNew ? 'Tambah lab' : 'Simpan ruangan'}</Text>
      </Button>
      {!isNew && (
        <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
          <Text className="text-destructive">Hapus lab</Text>
        </Button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus lab ini?"
        body={usedBy ? `${usedBy} sesi masih memakai lab ini. Pindahkan dulu sesinya sebelum menghapus.` : 'Lab akan hilang dari peta dan pilihan sesi.'}
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (usedBy) return;
          deleteLab(lab.id);
          router.replace('/lab');
        }}
      />
      {dialog}
    </Screen>
  );
}
