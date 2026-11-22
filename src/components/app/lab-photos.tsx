import { Image } from 'expo-image';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Star, Trash, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useStore } from '@/data/store';
import { pickRoomPhoto } from '@/lib/photos';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 8;

/** Cover photo with a count badge; opens the viewer. Renders nothing when the room has no photos. */
export function LabCover({ photos, name, className }: { photos: string[]; name: string; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Foto ${name}`} onPress={() => setOpen(0)} className={cn('overflow-hidden rounded-3xl', className)}>
        <Image source={{ uri: photos[0] }} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="cover" />
        {photos.length > 1 && (
          <View className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1">
            <Text className="text-xs font-bold text-white">1/{photos.length} foto</Text>
          </View>
        )}
      </Pressable>
      <PhotoViewer photos={photos} index={open} onIndex={setOpen} />
    </>
  );
}

/** Horizontal strip of thumbnails; tap to view large. */
export function LabPhotoStrip({ photos, emptyText }: { photos: string[]; emptyText?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return emptyText ? <Text className="text-muted-foreground text-sm">{emptyText}</Text> : null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 grow-0" contentContainerClassName="gap-2 px-4">
        {photos.map((uri, i) => (
          <Pressable key={uri.slice(-40) + i} accessibilityRole="imagebutton" accessibilityLabel={`Foto ${i + 1}`} onPress={() => setOpen(i)} className="overflow-hidden rounded-2xl">
            <Image source={{ uri }} style={{ width: 168, height: 126 }} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      <PhotoViewer photos={photos} index={open} onIndex={setOpen} />
    </>
  );
}

function PhotoViewer({ photos, index, onIndex }: { photos: string[]; index: number | null; onIndex: (i: number | null) => void }) {
  const i = index ?? 0;
  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && onIndex(null)}>
      <DialogContent className="w-[94vw] max-w-3xl gap-3 rounded-3xl p-3">
        {index !== null && (
          <>
            <Image source={{ uri: photos[i] }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18 }} contentFit="contain" />
            <View className="flex-row items-center justify-between">
              <RoundButton icon={ChevronLeft} label="Sebelumnya" disabled={i === 0} onPress={() => onIndex(i - 1)} />
              <Text className="font-mono text-sm font-bold">
                {i + 1} / {photos.length}
              </Text>
              <RoundButton icon={ChevronRight} label="Berikutnya" disabled={i >= photos.length - 1} onPress={() => onIndex(i + 1)} />
            </View>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoundButton({ icon, label, onPress, disabled, tone }: { icon: typeof X; label: string; onPress: () => void; disabled?: boolean; tone?: 'danger' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={cn('size-10 items-center justify-center rounded-full disabled:opacity-30', tone === 'danger' ? 'bg-danger-soft' : 'bg-muted')}
    >
      <Icon as={icon} className={cn('size-[18px]', tone === 'danger' && 'text-danger-ink')} />
    </Pressable>
  );
}

/** Koordinator editor: add from gallery or camera, reorder, set cover, delete (confirmed). */
export function LabPhotoEditor({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  const { toast } = useStore();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);

  const add = async (source: 'library' | 'camera') => {
    if (photos.length >= MAX_PHOTOS) return toast({ title: `Maksimal ${MAX_PHOTOS} foto per ruangan`, tone: 'danger' });
    setBusy(true);
    try {
      const uri = await pickRoomPhoto(source);
      if (uri) onChange([...photos, uri]);
    } catch (e) {
      toast({ title: e instanceof Error && e.message === 'CAMERA_DENIED' ? 'Izin kamera ditolak' : 'Foto gagal ditambahkan', tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  const move = (from: number, to: number) => {
    const next = [...photos];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  return (
    <View className="gap-3">
      {photos.length > 0 && (
        <View className="flex-row flex-wrap gap-3">
          {photos.map((uri, i) => (
            <View key={uri.slice(-40) + i} className="border-border w-[47%] gap-2 overflow-hidden rounded-2xl border p-2 sm:w-[31%]">
              <View className="overflow-hidden rounded-xl">
                <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="cover" />
                {i === 0 && (
                  <View className="bg-mustard absolute left-2 top-2 flex-row items-center gap-1 rounded-full px-2 py-0.5">
                    <Icon as={Star} className="text-on-bright size-3" strokeWidth={2.6} />
                    <Text className="text-on-bright text-[11px] font-bold">Sampul</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center justify-between">
                <RoundButton icon={ChevronLeft} label="Geser ke kiri" disabled={i === 0} onPress={() => move(i, i - 1)} />
                {i !== 0 ? <RoundButton icon={Star} label="Jadikan sampul" onPress={() => move(i, 0)} /> : <View className="size-10" />}
                <RoundButton icon={ChevronRight} label="Geser ke kanan" disabled={i === photos.length - 1} onPress={() => move(i, i + 1)} />
                <RoundButton
                  icon={Trash}
                  label="Hapus foto"
                  tone="danger"
                  onPress={() =>
                    confirm({
                      title: 'Hapus foto ini?',
                      body: 'Foto hilang dari halaman ruangan setelah kamu menyimpan perubahan.',
                      confirmLabel: 'Hapus',
                      destructive: true,
                      onConfirm: () => onChange(photos.filter((_, k) => k !== i)),
                    })
                  }
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => add('library')}
          className="border-border active:bg-accent h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed disabled:opacity-50"
        >
          <Icon as={ImagePlus} className="size-[18px]" />
          <Text className="text-sm font-semibold">Dari galeri</Text>
        </Pressable>
        {Platform.OS !== 'web' && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => add('camera')}
            className="border-border active:bg-accent h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed disabled:opacity-50"
          >
            <Icon as={Camera} className="size-[18px]" />
            <Text className="text-sm font-semibold">Kamera</Text>
          </Pressable>
        )}
      </View>
      <Text className="text-muted-foreground text-xs">
        {photos.length}/{MAX_PHOTOS} foto. Foto pertama jadi sampul. Ambil dari pintu masuk dan papan nama ruangan supaya mudah dikenali.
      </Text>
      {dialog}
    </View>
  );
}
