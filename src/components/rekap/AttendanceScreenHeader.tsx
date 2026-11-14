import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LabSyncColors as colors, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';

export function AttendanceScreenHeader({ title, onBack, notice, onRetry }: {
  title: string;
  onBack: () => void;
  notice?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backLabel}>Kembali</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {!!notice && <View style={styles.notice}>
        <Text accessibilityRole="alert" style={styles.noticeText}>{notice}</Text>
        {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.back}>
          <Text style={styles.backLabel}>Coba lagi</Text>
        </Pressable>}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  back: { minHeight: 48, paddingVertical: space.md, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { ...type.button, color: colors.primary },
  title: { ...type.title, color: colors.text },
  notice: { padding: space.md, backgroundColor: colors.primarySurface, borderRadius: 10 },
  noticeText: { ...type.body, color: colors.textSecondary },
  pressed: { opacity: 0.8 },
});
