import { StyleSheet, Text, View } from 'react-native';

import { LabSyncColors as colors, LabSyncFonts as fonts, LabSyncRadii as radii } from '@/constants/labsync-theme';

/** LabSync wordmark: a ruled "attendance sheet" mark beside the serif name. */
export function Wordmark({ size = 'md', header = true }: { size?: 'md' | 'lg'; header?: boolean }) {
  const large = size === 'lg';
  return (
    <View style={styles.row}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.mark, large && styles.markLarge]}
      >
        <View style={[styles.tick, large && styles.tickLarge]} />
        <View style={styles.bar} />
        <View style={[styles.bar, styles.barShort]} />
      </View>
      <Text accessibilityRole={header ? 'header' : undefined} style={[styles.name, large && styles.nameLarge]}>
        LabSync
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  mark: {
    width: 30,
    height: 30,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 7,
    justifyContent: 'space-between',
  },
  markLarge: { width: 40, height: 40, paddingHorizontal: 8, paddingVertical: 9 },
  tick: { width: 6, height: 3, backgroundColor: '#FFFFFF', borderRadius: 1 },
  tickLarge: { width: 8 },
  bar: { height: 2, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 1 },
  barShort: { width: '62%' },
  name: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4, color: colors.text, flexShrink: 1 },
  nameLarge: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
});
