import { MapPin } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Lab, Position } from '@/data/types';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * Map-free geofence view: lab at the center, the allowed radius as a ring,
 * and the user's dot placed by real bearing and distance. Drawn for an ink (dark) card.
 */
export function GeoRadar({ lab, position, size = 240 }: { lab: Lab; position?: Position | null; size?: number }) {
  const distance = position ? distanceMeters(position, lab) : null;
  const inside = distance !== null && distance <= lab.radiusM;
  // Outside the radius is a hard "not yet": alarm red, not the brand coral.
  const outside = distance !== null && !inside;
  // Scale so the radius ring sits at ~45% of the box; far users get pinned to the edge.
  const span = Math.max(lab.radiusM * 2.2, 60);
  const half = size / 2;
  const ringPx = (lab.radiusM / span) * size;

  let dot: { x: number; y: number; clamped: boolean } | null = null;
  if (position) {
    const north = (position.lat - lab.lat) * 111_320;
    const east = (position.lng - lab.lng) * 111_320 * Math.cos((lab.lat * Math.PI) / 180);
    let x = (east / span) * size;
    let y = (-north / span) * size;
    const len = Math.hypot(x, y);
    const max = half - 14;
    const clamped = len > max;
    if (clamped) {
      x = (x / len) * max;
      y = (y / len) * max;
    }
    dot = { x: half + x, y: half + y, clamped };
  }
  const accuracyPx = position ? Math.min(half, (position.accuracyM / span) * size) : 0;

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }} className="items-center justify-center">
        {/* Grid rings */}
        {[1, 0.72, 0.44].map((f) => (
          <View
            key={f}
            className="absolute rounded-full border border-white/15"
            style={{ width: size * f, height: size * f, borderStyle: f === 1 ? 'solid' : 'dashed' }}
          />
        ))}
        {/* Allowed radius */}
        <View
          className={cn('absolute rounded-full border-[3px]', inside ? 'bg-aqua/20 border-aqua' : outside ? 'bg-alarm/20 border-alarm border-[4px]' : 'border-white/40 bg-white/5')}
          style={{ width: ringPx * 2, height: ringPx * 2 }}
        />
        <Pulse size={ringPx * 2} color={inside ? THEME.light.aqua : outside ? THEME.light.alarm : '#FFFFFF'} />
        {/* Lab marker */}
        <View className="bg-violet border-ink absolute size-11 items-center justify-center rounded-full border-4">
          <Icon as={MapPin} className="size-5 text-white" strokeWidth={2.6} />
        </View>
        {/* User */}
        {dot && (
          <>
            <View
              className={cn('absolute rounded-full', inside ? 'bg-aqua/15' : 'bg-alarm/15')}
              style={{ width: accuracyPx * 2, height: accuracyPx * 2, left: dot.x - accuracyPx, top: dot.y - accuracyPx }}
            />
            <View
              className={cn('border-ink absolute size-6 rounded-full border-4', inside ? 'bg-aqua' : 'bg-alarm')}
              style={{ left: dot.x - 12, top: dot.y - 12 }}
            />
          </>
        )}
        {/* Compass */}
        <Text className="text-ink-muted absolute top-1 font-mono text-[10px] font-bold">U</Text>
      </View>
      <View className="mt-3 items-center gap-0.5">
        <Text className={cn('font-display text-[64px] font-extrabold leading-[64px]', inside ? 'text-aqua' : outside ? 'text-alarm' : 'text-ink-foreground')} style={{ fontVariant: ['tabular-nums'] }}>
          {distance === null ? '—' : formatDistance(distance)}
        </Text>
        <Text className="text-ink-muted text-center text-sm font-medium">
          {distance === null
            ? 'menunggu lokasi'
            : outside
              ? `${formatDistance(distance - lab.radiusM)} lagi ke radius ${lab.name}`
              : `dari ${lab.name} · radius ${lab.radiusM} m`}
        </Text>
      </View>
    </View>
  );
}

function Pulse({ size, color }: { size: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 0.6 + p.value * 0.6 }] }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color + '40' }, style]} />;
}
