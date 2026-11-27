import { router, type Href } from 'expo-router';
import { BellOff, BellRing, CalendarClock, CheckCheck, CircleCheck, CircleX, FileText, Inbox, Megaphone, Play, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState, IconTile, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import type { Tone } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useMe, useStore } from '@/data/store';
import type { NotificationType } from '@/data/types';
import { setPrefs, usePrefs } from '@/hooks/use-prefs';
import { useNow } from '@/hooks/use-now';
import { isSameDay, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const META: Record<NotificationType, { icon: typeof Inbox; tone: Tone }> = {
  SESSION_OPENED: { icon: Play, tone: 'success' },
  SCHEDULE_CHANGED: { icon: CalendarClock, tone: 'warning' },
  LEAVE_APPROVED: { icon: CircleCheck, tone: 'success' },
  LEAVE_REJECTED: { icon: CircleX, tone: 'danger' },
  LEAVE_SUBMITTED: { icon: FileText, tone: 'info' },
  FINE_CREATED: { icon: Wallet, tone: 'warning' },
  PAYMENT_SUCCESS: { icon: CircleCheck, tone: 'success' },
  PAYMENT_FAILED: { icon: CircleX, tone: 'danger' },
  REMINDER: { icon: BellRing, tone: 'brand' },
  SYSTEM: { icon: Megaphone, tone: 'neutral' },
};

export default function NotificationsScreen() {
  const { state, markRead, markAllRead } = useStore();
  const me = useMe();
  const now = useNow(30_000);
  const prefs = usePrefs();
  const mine = useMemo(() => state.notifications.filter((n) => n.nim === me.nim).sort((a, b) => b.createdAt - a.createdAt), [state, me]);
  const today = mine.filter((n) => isSameDay(n.createdAt, now));
  const earlier = mine.filter((n) => !isSameDay(n.createdAt, now));
  const unread = mine.filter((n) => !n.readAt).length;

  const list = (items: typeof mine) => (
    <Surface className="overflow-hidden">
      {items.map((n, i) => {
        const meta = META[n.type];
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() => {
              markRead(n.id);
              if (n.href) router.push(n.href as Href);
            }}
            className={cn('active:bg-accent flex-row gap-3 px-4 py-3.5', i > 0 && 'border-border border-t', !n.readAt && 'bg-brand-soft/40')}
          >
            <IconTile icon={meta.icon} tone={meta.tone} />
            <View className="min-w-0 flex-1 gap-0.5">
              <View className="flex-row items-start gap-2">
                <Text className={cn('min-w-0 flex-1 text-sm', n.readAt ? 'font-medium' : 'font-bold')} numberOfLines={2}>{n.title}</Text>
                <Text className="text-muted-foreground text-xs">{relativeTime(n.createdAt, now)}</Text>
              </View>
              <Text className="text-muted-foreground text-[13px] leading-5" numberOfLines={3}>{n.body}</Text>
            </View>
            {!n.readAt && <View className="bg-primary mt-1.5 size-2 rounded-full" />}
          </Pressable>
        );
      })}
    </Surface>
  );

  return (
    <Screen
      header={
        <PageHeader
          title="Notifikasi"
          subtitle={unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
          right={
            unread ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Tandai semua dibaca" onPress={markAllRead} className="active:bg-accent size-10 items-center justify-center rounded-full">
                <Icon as={CheckCheck} className="size-5" />
              </Pressable>
            ) : undefined
          }
        />
      }
    >
      {prefs.push !== 'granted' && (
        <View className="bg-warning-soft gap-3 rounded-2xl p-4">
          <View className="flex-row gap-3">
            <Icon as={BellOff} className="text-warning-ink mt-0.5 size-5" />
            <View className="min-w-0 flex-1">
              <Text className="text-warning-ink text-sm font-semibold">Push notification tidak aktif</Text>
              <Text className="text-warning-ink text-[13px] leading-5">
                Kamu tidak akan dapat pemberitahuan di luar aplikasi saat sesi dibuka atau jadwal berubah. Semua pemberitahuan tetap tersimpan di sini.
              </Text>
            </View>
          </View>
          <Button size="sm" variant="outline" className="self-start rounded-full" onPress={() => setPrefs({ push: 'granted' })}>
            <Text>Aktifkan notifikasi</Text>
          </Button>
        </View>
      )}
      {mine.length === 0 ? (
        <EmptyState icon={Inbox} title="Belum ada notifikasi" body="Pembukaan sesi, perubahan jadwal, dan keputusan izin akan muncul di sini." />
      ) : (
        <>
          {today.length > 0 && <Section title="Hari ini">{list(today)}</Section>}
          {earlier.length > 0 && <Section title="Sebelumnya">{list(earlier)}</Section>}
        </>
      )}
    </Screen>
  );
}
