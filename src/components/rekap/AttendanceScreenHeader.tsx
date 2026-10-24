import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LabSyncColors as colors, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';

export function AttendanceScreenHeader({ title, onBack, notice }: {
  title: string;
  onBack: () => void;
  notice?: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke beranda" onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backLabel}>Kembali ke beranda</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {notice && <Text style={styles.notice}>{notice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  back: { minHeight: 48, paddingVertical: space.md, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { ...type.button, color: colors.primary },
  title: { ...type.title, color: colors.text },
  notice: { ...type.body, color: colors.textSecondary, padding: space.md, backgroundColor: colors.primarySurface, borderRadius: 10 },
  pressed: { opacity: 0.8 },
});
