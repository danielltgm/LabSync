import { ChevronDown, FlaskConical } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { setSimulatedSpot, SIMULATED_SPOTS, useSimulatedSpot } from '@/hooks/use-location';
import { cn } from '@/lib/utils';

/** Demo-only control to fake GPS conditions, so every edge case can be shown on web. */
export function DemoLocationPicker({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const spot = useSimulatedSpot();
  const [open, setOpen] = useState(defaultOpen);
  const current = SIMULATED_SPOTS.find((s) => s.value === spot);
  return (
    <View className="border-border rounded-2xl border border-dashed">
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} className="flex-row items-center gap-3 p-3.5">
        <Icon as={FlaskConical} className="text-muted-foreground size-4" />
        <View className="min-w-0 flex-1">
          <Text className="text-[13px] font-semibold">Mode demo · simulasi lokasi</Text>
          <Text className="text-muted-foreground text-xs">{current?.label} — {current?.hint}</Text>
        </View>
        <Icon as={ChevronDown} className={cn('text-muted-foreground size-4', open && 'rotate-180')} />
      </Pressable>
      {open && (
        <View className="flex-row flex-wrap gap-2 px-3.5 pb-3.5">
          {SIMULATED_SPOTS.map((s) => (
            <Pressable
              key={s.value}
              accessibilityRole="button"
              accessibilityState={{ selected: s.value === spot }}
              onPress={() => setSimulatedSpot(s.value)}
              className={cn(
                'rounded-full border px-3 py-1.5',
                s.value === spot ? 'bg-foreground border-foreground' : 'border-border bg-card active:bg-accent',
              )}
            >
              <Text className={cn('text-xs font-semibold', s.value === spot ? 'text-background' : 'text-foreground')}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
