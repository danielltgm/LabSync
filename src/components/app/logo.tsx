import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const ICON = require('../../../assets/images/icon.png');

export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const px = size === 'lg' ? 48 : size === 'sm' ? 28 : 36;
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl';
  return (
    <View className={cn('flex-row items-center gap-2.5', className)}>
      <Image source={ICON} style={{ width: px, height: px, borderRadius: px * 0.28 }} contentFit="cover" accessibilityLabel="Logo LabSync" />
      <Text className={cn('font-display font-extrabold uppercase', text)}>LabSync</Text>
    </View>
  );
}
