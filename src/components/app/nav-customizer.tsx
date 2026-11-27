import { router } from 'expo-router';
import { GraduationCap, House, RotateCcw, Settings2, ShieldCheck, User, UserCog } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { IconTile, Segmented } from '@/components/app/primitives';
import type { Tone } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { DEFAULT_SLOTS, SLOT_META, SLOT_NAMES, slotsAllowed, useNavSlots, useShortcuts } from '@/data/nav';
import { useMe, useStore } from '@/data/store';
import type { NavSlot, Role } from '@/data/types';
import { useLayout } from '@/hooks/use-layout';
import { setPrefs, usePrefs, type BarPlacement } from '@/hooks/use-prefs';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------ role badge */

export const ROLE_STYLE: Record<Role, { label: string; icon: typeof User; bg: string; fg: string; ring: string }> = {
  PRAKTIKAN: { label: 'Praktikan', icon: GraduationCap, bg: 'bg-coral', fg: 'text-on-bright', ring: 'border-coral' },
  ASPRAK: { label: 'Asprak', icon: UserCog, bg: 'bg-violet', fg: 'text-white', ring: 'border-violet' },
  ASLAB: { label: 'Aslab', icon: ShieldCheck, bg: 'bg-mustard', fg: 'text-on-bright', ring: 'border-mustard' },
};

/** Big, coloured "who am I" pill (same colours as the demo account cards on login). */
export function RoleBadge({ role, size = 'md' }: { role: Role; size?: 'sm' | 'md' }) {
  const r = ROLE_STYLE[role];
  return (
    <View className={cn('flex-row items-center gap-1.5 self-start rounded-full', r.bg, size === 'sm' ? 'py-0.5 pl-1.5 pr-2.5' : 'py-1 pl-2 pr-3')}>
      <Icon as={r.icon} className={cn(r.fg, size === 'sm' ? 'size-3.5' : 'size-4')} strokeWidth={2.6} />
      <Text className={cn('font-display font-extrabold uppercase', r.fg, size === 'sm' ? 'text-[11px] leading-4' : 'text-[13px] leading-5')}>{r.label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- shortcuts */

const SHORTCUT_TONE: Record<string, Tone> = {
  jadwal: 'brand', presensi: 'danger', kelas: 'brand', izin: 'warning', admin: 'danger', peta: 'info', log: 'neutral',
  'izin-baru': 'warning', riwayat: 'success', lab: 'info', notifikasi: 'brand', 'sesi-baru': 'success', 'kelas-baru': 'success',
  denda: 'danger', 'denda-riwayat': 'info', 'dashboard-lab': 'brand', 'lab-transfer': 'warning',
};

/** "Pintasan": everything that is not in the bottom bar, plus the bar customizer. */
export function Shortcuts() {
  const items = useShortcuts();
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[17px] font-bold">Pintasan</Text>
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8} className="flex-row items-center gap-1.5 active:opacity-70">
          <Icon as={Settings2} className="text-primary size-4" />
          <Text className="text-primary text-sm font-semibold">Atur bottom bar</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {items.map((s) => (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityHint={s.hint}
            onPress={() => router.push(s.href)}
            className="bg-card active:bg-accent min-w-[45%] flex-1 flex-row items-center gap-3 rounded-[24px] p-3"
          >
            <IconTile icon={s.icon} tone={SHORTCUT_TONE[s.key] ?? 'neutral'} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold" numberOfLines={1}>
                {s.label}
              </Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {s.hint}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <NavCustomizer open={open} onOpenChange={setOpen} />
    </View>
  );
}

/* ------------------------------------------------------------ customizer */

/**
 * Pick the three middle slots. Tap a slot in the preview, then a feature below.
 * Choosing a feature that is already in another slot swaps the two.
 */
export function NavCustomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const me = useMe();
  const { setNavSlots, toast } = useStore();
  const current = useNavSlots();
  const [draft, setDraft] = useState<NavSlot[]>(current);
  const [active, setActive] = useState(1);
  const allowed = slotsAllowed(me.role);
  const { wide } = useLayout();
  const { barPlacement } = usePrefs();
  const [placement, setPlacement] = useState<BarPlacement>(barPlacement);

  const pick = (slot: NavSlot) => {
    setDraft((d) => {
      const next = [...d];
      const at = next.indexOf(slot);
      if (at !== -1) next[at] = next[active];
      next[active] = slot;
      return next;
    });
  };
  const isDefault = DEFAULT_SLOTS[me.role].every((s, i) => s === draft[i]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setDraft(current);
          setPlacement(barPlacement);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="w-[94vw] max-w-md gap-4 rounded-3xl">
        <DialogHeader>
          <DialogTitle>Atur bottom bar</DialogTitle>
          <DialogDescription>Beranda dan Profil selalu ada. Pilih 3 fitur di tengah; yang lain tetap ada di Pintasan.</DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <View className="bg-ink h-[68px] flex-row items-center rounded-full px-2">
          <PreviewIcon icon={House} />
          {draft.map((s, i) => {
            const meta = SLOT_META[s];
            const center = i === 1;
            const selected = i === active;
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Slot ${SLOT_NAMES[i]}: ${meta.label}`} onPress={() => setActive(i)} className="h-full flex-1 items-center justify-center">
                <View
                  className={cn(
                    'items-center justify-center rounded-full',
                    center ? 'bg-coral border-ink size-14 border-4' : 'size-11',
                    selected && (center ? 'border-aqua' : 'bg-aqua'),
                  )}
                >
                  <Icon as={meta.icon} className={cn('size-[22px]', center || selected ? 'text-on-bright' : 'text-ink-muted')} strokeWidth={2.4} />
                </View>
              </Pressable>
            );
          })}
          <PreviewIcon icon={User} />
        </View>
        <Text className="text-muted-foreground -mt-1 text-center text-xs">
          Mengubah slot <Text className="text-xs font-bold">{SLOT_NAMES[active].toLowerCase()}</Text>: {SLOT_META[draft[active]].label}
        </Text>

        <BarPlacementPicker value={placement} onChange={setPlacement} wide={wide} />

        <View className="gap-2">
          {allowed.map((s) => {
            const meta = SLOT_META[s];
            const at = draft.indexOf(s);
            const here = at === active;
            return (
              <Pressable
                key={s}
                accessibilityRole="radio"
                accessibilityState={{ checked: here }}
                onPress={() => pick(s)}
                className={cn('flex-row items-center gap-3 rounded-2xl border p-3', here ? 'border-primary bg-brand-soft' : 'border-border active:bg-accent')}
              >
                <Icon as={meta.icon} className="size-5" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold">{meta.label}</Text>
                  <Text className="text-muted-foreground text-xs">{meta.hint}</Text>
                </View>
                {at !== -1 && (
                  <View className={cn('rounded-full px-2 py-0.5', here ? 'bg-primary' : 'bg-muted')}>
                    <Text className={cn('font-mono text-[10px] font-bold uppercase', here ? 'text-primary-foreground' : 'text-muted-foreground')}>{SLOT_NAMES[at]}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="ghost"
            disabled={isDefault && placement === 'left'}
            className="rounded-xl"
            onPress={() => {
              setDraft(DEFAULT_SLOTS[me.role]);
              setPlacement('left');
            }}
          >
            <Icon as={RotateCcw} className="size-4" />
            <Text>Default</Text>
          </Button>
          <Button
            className="flex-1 rounded-xl"
            onPress={() => {
              setNavSlots(isDefault ? null : draft);
              setPrefs({ barPlacement: placement });
              onOpenChange(false);
              toast({ title: 'Bottom bar diperbarui', tone: 'success' });
            }}
          >
            <Text>Simpan</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tablet / desktop only: rail on the left or right, or a bar at the bottom like on phones. */
export function BarPlacementPicker({ value, onChange, wide }: { value: BarPlacement; onChange: (v: BarPlacement) => void; wide: boolean }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold">Posisi di tablet</Text>
      <Segmented<BarPlacement>
        value={value}
        onChange={onChange}
        options={[
          { value: 'left', label: 'Kiri' },
          { value: 'right', label: 'Kanan' },
          { value: 'bottom', label: 'Bawah' },
        ]}
      />
      <Text className="text-muted-foreground text-xs">
        {wide ? 'Berlaku di perangkat ini.' : 'Untuk tablet dan layar lebar. Di HP bar selalu di bawah.'}
      </Text>
    </View>
  );
}

function PreviewIcon({ icon }: { icon: typeof House }) {
  return (
    <View className="h-full flex-1 items-center justify-center opacity-50">
      <Icon as={icon} className="text-ink-muted size-[22px]" strokeWidth={2.4} />
    </View>
  );
}
