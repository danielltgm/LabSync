import { Image } from 'expo-image';
import { CalendarDays, Clock, Copy, Download, Image as ImageIcon, Link2, MapPin, Send, Share2, Type, Users } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Mascot, type MascotMood } from '@/components/app/mascot';
import { Segmented } from '@/components/app/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/data/store';
import { shareImage, shareText, type ShareTarget } from '@/lib/share';
import { cn } from '@/lib/utils';

const ICON = require('../../../assets/images/icon.png');

/* Fixed colours: the shared image must look the same whatever theme the sender uses. */
const C = { violet: '#6B66F0', ink: '#1B1B1B', cream: '#F7F3EC', coral: '#F46143', mustard: '#F5C443', white: '#FFFFFF', muted: 'rgba(255,255,255,0.78)' };

export interface ShareCardData {
  eyebrow: string;
  kicker: string;
  title: string;
  rows: { icon: typeof Clock; text: string }[];
  chips?: string[];
  note?: string;
  mood?: MascotMood;
  accent?: 'violet' | 'coral';
}

/** The poster that becomes the shared image. Width follows the preview (max 340) so what you see is what gets sent. */
function ShareCard({ data, width }: { data: ShareCardData; width: number }) {
  const bg = data.accent === 'coral' ? C.coral : C.violet;
  return (
    <View style={{ width, backgroundColor: C.cream, borderRadius: 28, overflow: 'hidden' }}>
      <View style={{ backgroundColor: bg, padding: 20, gap: 10 }}>
        <View className="flex-row items-center gap-2">
          <Image source={ICON} style={{ width: 26, height: 26, borderRadius: 8 }} contentFit="cover" />
          <Text className="font-display text-base font-extrabold uppercase" style={{ color: C.white }}>
            LabSync
          </Text>
          <View className="flex-1" />
          <Text className="font-mono text-[10px] font-bold uppercase" style={{ color: C.muted }} numberOfLines={1}>
            {data.eyebrow}
          </Text>
        </View>
        <View className="flex-row items-end gap-2">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="font-mono text-[11px] font-bold uppercase" style={{ color: C.mustard }}>
              {data.kicker}
            </Text>
            <Text className="font-display text-[28px] font-extrabold uppercase leading-[30px]" style={{ color: C.white }}>
              {data.title}
            </Text>
          </View>
          <Mascot mood={data.mood ?? 'hello'} size={78} float={false} />
        </View>
      </View>
      <View style={{ padding: 18, gap: 10 }}>
        {data.rows.map((r, i) => (
          <View key={i} className="flex-row items-center gap-2.5">
            <View style={{ backgroundColor: C.ink, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Icon as={r.icon} className="size-3.5 text-white" strokeWidth={2.4} />
            </View>
            <Text className="min-w-0 flex-1 text-[14px] font-semibold" style={{ color: C.ink }}>
              {r.text}
            </Text>
          </View>
        ))}
        {!!data.chips?.length && (
          <View className="flex-row flex-wrap gap-1.5 pt-1">
            {data.chips.map((c) => (
              <View key={c} style={{ backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text className="text-[11px] font-bold" style={{ color: C.white }}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        )}
        {!!data.note && (
          <Text className="text-[12px] leading-4" style={{ color: '#5B5B5B' }} numberOfLines={3}>
            {data.note}
          </Text>
        )}
      </View>
    </View>
  );
}

type Mode = 'gambar' | 'teks';

const TEXT_TARGETS: { key: ShareTarget; label: string; icon: typeof Send; bg: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: Send, bg: 'bg-[#25D366]' },
  { key: 'x', label: 'X', icon: Send, bg: 'bg-foreground' },
  { key: 'telegram', label: 'Telegram', icon: Send, bg: 'bg-[#2AABEE]' },
  { key: 'copy', label: 'Salin', icon: Copy, bg: 'bg-muted' },
  { key: 'system', label: 'Lainnya', icon: Share2, bg: 'bg-muted' },
];

/**
 * Share pop-up: pick Gambar (poster + caption) or Teks, see the preview, then pick where.
 * `text` = WhatsApp-style message (editable), `short` = compact version for X.
 */
export function ShareSheet({
  open,
  onOpenChange,
  title,
  card,
  text,
  short,
  link,
  fileName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  card: ShareCardData;
  text: string;
  short: string;
  link?: string;
  fileName: string;
}) {
  const { toast } = useStore();
  const [mode, setMode] = useState<Mode>('gambar');
  const [message, setMessage] = useState(text);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [cardWidth, setCardWidth] = useState(320);

  const sendText = async (target: ShareTarget) => {
    // X has a 280 character limit, so it gets the short version unless the message was edited.
    const body = target === 'x' && message === text ? short : message;
    try {
      const r = await shareText(target, body, link);
      if (r === 'copied') toast({ title: 'Teks disalin', tone: 'success' });
      if (r !== 'dismissed') onOpenChange(false);
    } catch {
      toast({ title: 'Tidak bisa membuka aplikasi itu', tone: 'danger' });
    }
  };

  const sendImage = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef as never, { format: 'png', quality: 1, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' });
      const r = await shareImage(uri, message, fileName);
      if (r === 'downloaded') toast({ title: 'Gambar diunduh', body: 'Teks keterangan juga sudah disalin.', tone: 'success' });
      else if (r === 'shared') toast({ title: 'Teks keterangan disalin', body: 'Tempel sebagai caption di aplikasi tujuan.', tone: 'success' });
      if (r !== 'dismissed') onOpenChange(false);
    } catch {
      toast({ title: 'Gambar gagal dibuat', tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setMessage(text);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] w-[94vw] max-w-md gap-3 rounded-3xl p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Kirim ke grup kelas, WhatsApp, X, atau aplikasi lain. Hanya info pertemuan yang dibagikan.</DialogDescription>
        </DialogHeader>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'gambar', label: 'Gambar + teks' },
            { value: 'teks', label: 'Teks saja' },
          ]}
        />
        <ScrollView className="grow-0" contentContainerClassName="gap-3" style={{ maxHeight: 440 }}>
          {mode === 'gambar' ? (
            <View className="bg-muted items-center rounded-3xl p-2" onLayout={(e) => setCardWidth(Math.min(340, Math.floor(e.nativeEvent.layout.width - 16)))}>
              {/* collapsable={false}: Android needs a real native view to capture. */}
              <View ref={cardRef} collapsable={false}>
                <ShareCard data={card} width={cardWidth} />
              </View>
            </View>
          ) : null}
          <View className="gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <Icon as={mode === 'gambar' ? Type : Link2} className="text-muted-foreground size-3.5" />
              <Text className="text-muted-foreground text-xs font-semibold">{mode === 'gambar' ? 'Caption (disalin otomatis)' : 'Pesan'}</Text>
            </View>
            <Textarea value={message} onChangeText={setMessage} className={cn('text-[13px] leading-5', mode === 'gambar' ? 'min-h-24' : 'min-h-56')} />
          </View>
        </ScrollView>

        {mode === 'gambar' ? (
          <Button size="lg" className="h-13 rounded-2xl" disabled={busy} onPress={sendImage}>
            <Icon as={Platform.OS === 'web' ? Download : ImageIcon} className="text-primary-foreground size-5" />
            <Text className="font-bold">{busy ? 'Membuat gambar…' : Platform.OS === 'web' ? 'Bagikan / unduh gambar' : 'Bagikan gambar'}</Text>
          </Button>
        ) : (
          <View className="flex-row gap-2">
            {TEXT_TARGETS.map((t) => (
              <Target key={t.key} label={t.label} onPress={() => sendText(t.key)}>
                <View className={cn('size-12 items-center justify-center rounded-full', t.bg)}>
                  <Icon as={t.icon} className={cn('size-5', t.key === 'copy' || t.key === 'system' ? 'text-foreground' : 'text-white', t.key === 'x' && 'text-background')} />
                </View>
              </Target>
            ))}
          </View>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Target({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Bagikan ke ${label}`} onPress={onPress} className="flex-1 items-center gap-1 active:opacity-70">
      {children}
      <Text className="text-[11px] font-semibold" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------- card builders */

export const CARD_ICONS = { CalendarDays, Clock, MapPin, Users };
