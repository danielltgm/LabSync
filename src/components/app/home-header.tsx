import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { ROLE_STYLE, RoleBadge } from '@/components/app/nav-customizer';
import { Avatar } from '@/components/app/primitives';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useMe, useUnreadCount } from '@/data/store';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function HomeHeader({ now }: { now: number }) {
  const me = useMe();
  const unread = useUnreadCount();
  const first = me.name.replace(/^Dr\.\s*/, '').split(' ')[0];
  return (
    <View className="flex-row items-center gap-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Profil dan pengaturan" onPress={() => router.push('/profil')} className="active:opacity-80">
        {/* Ring in the role colour: praktikan coral, asisten violet, koordinator mustard. */}
        <View className={cn('rounded-full border-[3px] p-0.5', ROLE_STYLE[me.role].ring)}>
          <Avatar name={me.name} size="md" />
        </View>
      </Pressable>
      <View className="min-w-0 flex-1">
        <View className="mb-0.5 flex-row items-center gap-2">
          <RoleBadge role={me.role} size="sm" />
          <Text className="text-muted-foreground font-mono text-[11px] font-bold uppercase" numberOfLines={1}>
            {formatDate(now, { weekday: true })}
          </Text>
        </View>
        <Text className="font-display text-[26px] font-extrabold uppercase leading-7" numberOfLines={1}>{greeting(now)}, {first}!</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifikasi, ${unread} belum dibaca`}
        onPress={() => router.push('/notifikasi')}
        className="bg-card active:bg-accent size-12 items-center justify-center rounded-full"
      >
        <Icon as={Bell} className="size-5" strokeWidth={2.4} />
        {unread > 0 && (
          <View className="bg-coral border-background absolute -right-1 -top-1 min-w-6 items-center rounded-full border-2 px-1">
            <Text className="text-on-bright font-mono text-[11px] font-bold">{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
