import { router, type Href } from 'expo-router';
import { BellRing, CircleCheck, CircleX, Info } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useStore, type Toast } from '@/data/store';
import { cn } from '@/lib/utils';

const TONE = {
  default: { icon: Info, box: 'bg-muted', fg: 'text-foreground' },
  success: { icon: CircleCheck, box: 'bg-success-soft', fg: 'text-success-ink' },
  danger: { icon: CircleX, box: 'bg-danger-soft', fg: 'text-danger-ink' },
  push: { icon: BellRing, box: 'bg-brand-soft', fg: 'text-brand-ink' },
} as const;

/** In-app banner. Also stands in for push notifications while the app is in the foreground. */
export function ToastViewport() {
  const { toasts, dismissToast } = useStore();
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-0 z-50 items-center gap-2 px-4" style={{ paddingTop: insets.top + 8 }}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </View>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = TONE[toast.tone ?? 'default'];
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp} className="w-full max-w-md">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onDismiss();
          if (toast.href) router.push(toast.href as Href);
        }}
        className="bg-popover border-border flex-row items-start gap-3 rounded-2xl border p-3 shadow-lg shadow-black/10"
      >
        <View className={cn('size-9 items-center justify-center rounded-xl', tone.box)}>
          <Icon as={tone.icon} className={cn('size-5', tone.fg)} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          {toast.tone === 'push' && <Text className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">LabSync · sekarang</Text>}
          <Text className="text-sm font-semibold" numberOfLines={2}>{toast.title}</Text>
          {!!toast.body && <Text className="text-muted-foreground text-sm" numberOfLines={3}>{toast.body}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}
