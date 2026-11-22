import { router } from 'expo-router';
import { CalendarDays, ChevronRight, ExternalLink, FolderOpen, Link2, MapPin, MessageCircle, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { MaterialsEditor } from '@/components/app/materials-editor';
import { Surface } from '@/components/app/primitives';
import { Pill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useStore } from '@/data/store';
import type { ClassGroup, Material } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { countdown, formatDate, formatTimeRange, relativeDay, weekdayName } from '@/lib/format';
import { cn } from '@/lib/utils';

const LINK_SUGGESTIONS = ['Grup WhatsApp kelas', 'Folder modul (Drive)', 'Pengumpulan tugas', 'LMS / Kulon', 'Kontak asisten'];

function linkStyle(url: string) {
  if (/chat\.whatsapp\.com|wa\.me/i.test(url)) return { icon: MessageCircle, bg: 'bg-[#25D366]', fg: 'text-white' };
  if (/drive\.google|docs\.google|onedrive|dropbox/i.test(url)) return { icon: FolderOpen, bg: 'bg-mustard', fg: 'text-on-bright' };
  return { icon: Link2, bg: 'bg-muted', fg: 'text-foreground' };
}

/** "When is this class?" at a glance: weekly slot, room, and the next (or live) meeting. */
export function ClassScheduleCard({ cls }: { cls: ClassGroup }) {
  const { state } = useStore();
  const now = useNow(30_000);
  const lab = state.labs.find((l) => l.id === cls.labId);
  const upcoming = state.sessions
    .filter((s) => s.classId === cls.id && s.endsAt >= now && s.status !== 'DIBATALKAN' && s.status !== 'SELESAI')
    .sort((a, b) => a.startsAt - b.startsAt);
  const live = upcoming.find((s) => s.status === 'DIBUKA');
  const next = live ?? upcoming[0];
  const after = upcoming.filter((s) => s.id !== next?.id).slice(0, 2);

  return (
    <Surface className="gap-3 p-4">
      <View className="flex-row items-center gap-2">
        <Icon as={CalendarDays} className="size-4" />
        <Text className="min-w-0 flex-1 text-[15px] font-semibold">
          Tiap {weekdayName(cls.weekday)}, {cls.startTime}–{cls.endTime}
        </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/jadwal')} hitSlop={8}>
          <Text className="text-primary text-sm font-semibold">Jadwal</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-2">
        <Icon as={MapPin} className="text-muted-foreground size-4" />
        <Text className="text-muted-foreground min-w-0 flex-1 text-[13px]">{lab ? `${lab.name} · ${lab.building}, ${lab.floor}` : '-'}</Text>
      </View>
      {next ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/sesi/${next.id}`)}
          className={cn('flex-row items-center gap-3 rounded-2xl p-3', live ? 'bg-success-soft' : 'bg-muted')}
        >
          <View className="min-w-0 flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              <Text className="font-mono text-[11px] font-bold uppercase">{live ? 'Sedang berlangsung' : 'Berikutnya'}</Text>
              {!live && next.changeNote && <Pill tone="warning" label="Jadwal berubah" />}
            </View>
            <Text className="text-[15px] font-semibold" numberOfLines={1}>
              P{next.meetingNo} · {next.topic}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {relativeDay(next.startsAt, now)}, {formatTimeRange(next.startsAt, next.endsAt)}
              {!live && next.startsAt - now < 24 * 3600_000 ? ` · mulai ${countdown(next.startsAt, now)} lagi` : ''}
            </Text>
          </View>
          <Icon as={ChevronRight} className="text-muted-foreground size-4" />
        </Pressable>
      ) : (
        <Text className="text-muted-foreground text-sm">Tidak ada pertemuan mendatang.</Text>
      )}
      {after.length > 0 && (
        <View className="gap-1">
          {after.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`/sesi/${s.id}`)} className="flex-row items-center gap-2 py-1">
              <Text className="text-muted-foreground w-24 text-xs">{formatDate(s.startsAt, { weekday: true, short: true })}</Text>
              <Text className="min-w-0 flex-1 text-[13px]" numberOfLines={1}>
                P{s.meetingNo} · {s.topic}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Surface>
  );
}

/** Class resources (WhatsApp group, Drive…). Members open them; staff edit. */
export function ClassLinksCard({ cls, canEdit }: { cls: ClassGroup; canEdit: boolean }) {
  const { setClassLinks, toast } = useStore();
  const links = cls.links ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Material[]>(links);

  return (
    <Surface className="gap-3 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold">Tautan kelas</Text>
        {canEdit && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft(links);
              setEditing(true);
            }}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Icon as={Pencil} className="text-primary size-3.5" />
            <Text className="text-primary text-sm font-semibold">Atur</Text>
          </Pressable>
        )}
      </View>
      {links.length ? (
        <View className="gap-2">
          {links.map((l, i) => {
            const st = linkStyle(l.url);
            return (
              <Pressable
                key={`${l.url}-${i}`}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(l.url)}
                className="border-border active:bg-accent flex-row items-center gap-3 rounded-2xl border p-2.5"
              >
                <View className={cn('size-10 items-center justify-center rounded-xl', st.bg)}>
                  <Icon as={st.icon} className={cn('size-5', st.fg)} strokeWidth={2.2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold" numberOfLines={1}>
                    {l.label}
                  </Text>
                  <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                    {l.url.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
                <Icon as={ExternalLink} className="text-muted-foreground size-4" />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="text-muted-foreground text-sm">{canEdit ? 'Tambahkan link grup WhatsApp, folder modul, atau pengumpulan tugas.' : 'Belum ada tautan dari asisten.'}</Text>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] w-[94vw] max-w-md gap-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tautan kelas</DialogTitle>
            <DialogDescription>Terlihat oleh semua praktikan dan asisten kelas ini. Perubahan tercatat di log.</DialogDescription>
          </DialogHeader>
          <MaterialsEditor value={draft} onChange={setDraft} suggestions={LINK_SUGGESTIONS} />
          <DialogFooter className="flex-row gap-2">
            <Button variant="ghost" className="rounded-xl" onPress={() => setEditing(false)}>
              <Text>Batal</Text>
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onPress={() => {
                setClassLinks(cls.id, draft);
                setEditing(false);
                toast({ title: 'Tautan kelas disimpan', tone: 'success' });
              }}
            >
              <Text>Simpan</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Surface>
  );
}
