import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';

type InteractionState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

const hiddenFromA11y = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

/* ------------------------------------------------------------------ Button */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'quiet' | 'success' | 'muted';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  selected?: boolean;
  /** Visible glyph before the label; only use together with accessibilityLabel. */
  glyph?: string;
  accessibilityLabel?: string;
  compact?: boolean;
  grow?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  selected,
  glyph,
  accessibilityLabel,
  compact = false,
  grow = false,
  style,
  testID,
}: ButtonProps) {
  // Status-like variants keep their own legible surface when inert.
  const dimmed = disabled && variant !== 'success' && variant !== 'muted';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={(state) => {
        const { pressed, hovered, focused } = state as InteractionState;
        return [
          styles.button,
          compact && styles.buttonCompact,
          grow && styles.buttonGrow,
          buttonSurface[variant],
          !disabled && hovered && buttonHover[variant],
          !disabled && pressed && buttonPressed[variant],
          selected && styles.buttonSelected,
          dimmed && (variant === 'quiet' ? styles.quietDisabled : styles.buttonDisabled),
          focused && styles.focusRing,
          style,
        ];
      }}
    >
      {!!glyph && <Text {...hiddenFromA11y} style={[styles.buttonText, buttonText[variant], dimmed && styles.buttonTextDisabled]}>{glyph}</Text>}
      <Text style={[styles.buttonText, buttonText[variant], selected && styles.buttonTextSelected, dimmed && styles.buttonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* --------------------------------------------------------------- TextField */

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  invalid?: boolean;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function TextField({
  label,
  hint,
  invalid = false,
  mono = false,
  style,
  inputStyle,
  accessibilityLabel,
  onFocus,
  onBlur,
  readOnly,
  editable,
  multiline,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const locked = readOnly || editable === false;

  return (
    <View style={[styles.field, style]}>
      <Text {...hiddenFromA11y} style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={accessibilityLabel ?? label}
        readOnly={readOnly}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={colors.placeholder}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[
          styles.input,
          mono && styles.inputMono,
          multiline && styles.inputMultiline,
          locked && styles.inputLocked,
          focused && styles.inputFocused,
          invalid && styles.inputInvalid,
          inputStyle,
        ]}
      />
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

/* ------------------------------------------------------------------ Notice */

export type Tone = 'info' | 'success' | 'danger' | 'warning' | 'neutral';

export function Notice({ tone = 'info', message, alert = false, live = false, children, style }: {
  tone?: Tone;
  message: string;
  alert?: boolean;
  live?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.notice, noticeSurface[tone], style]}>
      <Text
        accessibilityRole={alert ? 'alert' : undefined}
        accessibilityLiveRegion={live ? 'polite' : undefined}
        style={[styles.noticeText, { color: toneText[tone] }]}
      >
        {message}
      </Text>
      {children ? <View style={styles.noticeActions}>{children}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------- Panel & structure */

export function Panel({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View style={[styles.panel, accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null, style]}>
      {children}
    </View>
  );
}

export function Eyebrow({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

export function Rule({ strong = false, style }: { strong?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View {...hiddenFromA11y} style={[strong ? styles.ruleStrong : styles.rule, style]} />;
}

export function MetaList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.metaList, style]}>{children}</View>;
}

export function MetaRow({ label, value, mono = false, strong = false, selectable = false }: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  selectable?: boolean;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text selectable={selectable} style={[styles.metaValue, mono && styles.metaMono, strong && styles.metaStrong]}>{value}</Text>
    </View>
  );
}

export function ActionRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.actionRow, style]}>{children}</View>;
}

export function LoadingLine({ label }: { label: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text accessibilityLiveRegion="polite" style={styles.loadingText}>{label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- PageHeader */

export function PageHeader({ title, onBack, backLabel = 'Kembali', eyebrow, subtitle, trailing, children }: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  eyebrow?: string;
  subtitle?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      {(onBack || trailing) && (
        <View style={styles.pageHeaderBar}>
          {onBack ? (
            <Button variant="quiet" compact glyph="←" label={backLabel} accessibilityLabel={backLabel} onPress={onBack} style={styles.backButton} />
          ) : <View />}
          {trailing}
        </View>
      )}
      <View style={styles.pageHeaderCopy}>
        {!!eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
      </View>
      <Rule strong />
      {children}
    </View>
  );
}

/* ------------------------------------------------------------- DialogFrame */

export function DialogFrame({ visible, onRequestClose, tone = 'info', dismissKeyboard = false, children }: {
  visible: boolean;
  onRequestClose: () => void;
  tone?: Tone;
  dismissKeyboard?: boolean;
  children: ReactNode;
}) {
  const body = (
    <KeyboardAvoidingView style={styles.dialogFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.dialogFill}
        contentContainerStyle={styles.dialogScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onRequestClose}
          style={[styles.dialogCard, { borderTopColor: toneSolid[tone] }]}
        >
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <SafeAreaView style={styles.backdrop}>
        {dismissKeyboard
          ? <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>{body}</TouchableWithoutFeedback>
          : body}
      </SafeAreaView>
    </Modal>
  );
}

export function DialogTitle({ children, eyebrow, eyebrowColor }: { children: ReactNode; eyebrow?: string; eyebrowColor?: string }) {
  return (
    <View style={styles.dialogTitleBlock}>
      {!!eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
      <Text accessibilityRole="header" style={styles.dialogTitle}>{children}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ tokens */

export const toneText: Record<Tone, string> = {
  info: colors.primaryPressed,
  success: colors.success.text,
  danger: colors.danger.text,
  warning: colors.warning.text,
  neutral: colors.neutral.text,
};

export const toneSolid: Record<Tone, string> = {
  info: colors.primary,
  success: colors.success.solid,
  danger: colors.danger.solid,
  warning: colors.warning.solid,
  neutral: colors.neutral.solid,
};

const noticeSurface = StyleSheet.create({
  info: { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
  success: { backgroundColor: colors.success.background, borderColor: colors.success.border },
  danger: { backgroundColor: colors.danger.background, borderColor: colors.danger.border },
  warning: { backgroundColor: colors.warning.background, borderColor: colors.warning.border },
  neutral: { backgroundColor: colors.neutral.background, borderColor: colors.neutral.border },
});

const buttonSurface = StyleSheet.create({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.borderSoft },
  danger: { backgroundColor: colors.danger.solid, borderColor: colors.danger.solid },
  dangerOutline: { backgroundColor: colors.surface, borderColor: colors.danger.border },
  quiet: { backgroundColor: 'transparent', borderColor: 'transparent' },
  success: { backgroundColor: colors.success.background, borderColor: colors.success.border },
  muted: { backgroundColor: colors.neutral.background, borderColor: colors.neutral.border },
});

const buttonHover = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  secondary: { borderColor: colors.text },
  danger: { backgroundColor: colors.danger.pressed, borderColor: colors.danger.pressed },
  dangerOutline: { backgroundColor: colors.danger.background },
  quiet: { backgroundColor: colors.surfaceSunken },
  success: {},
  muted: {},
});

const buttonPressed = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surfaceSunken, borderColor: colors.text },
  danger: { backgroundColor: colors.danger.pressed, borderColor: colors.danger.pressed },
  dangerOutline: { backgroundColor: colors.danger.background },
  quiet: { backgroundColor: colors.neutral.background },
  success: {},
  muted: {},
});

const buttonText = StyleSheet.create({
  primary: { color: colors.surface },
  secondary: { color: colors.text },
  danger: { color: colors.surface },
  dangerOutline: { color: colors.danger.text },
  quiet: { color: colors.primary },
  success: { color: colors.success.text },
  muted: { color: colors.neutral.text },
});

const styles = StyleSheet.create({
  button: {
    minHeight: layout.touch,
    minWidth: 44,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: space.md, paddingVertical: space.sm },
  buttonGrow: { flexGrow: 1, flexBasis: 140 },
  buttonSelected: { backgroundColor: colors.text, borderColor: colors.text },
  buttonDisabled: { backgroundColor: colors.neutral.background, borderColor: colors.neutral.border },
  quietDisabled: { backgroundColor: 'transparent' },
  buttonText: { ...type.button, textAlign: 'center', flexShrink: 1 },
  buttonTextSelected: { color: colors.surface },
  buttonTextDisabled: { color: colors.textMuted },
  focusRing: { outlineColor: colors.focus, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 },

  field: { gap: space.xs + 2, minWidth: 0 },
  fieldLabel: { ...type.label, color: colors.text },
  fieldHint: { ...type.caption, color: colors.textMuted },
  input: {
    ...type.body,
    color: colors.text,
    minHeight: layout.touch,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  inputMono: { ...type.mono, fontSize: 15 },
  inputMultiline: { minHeight: 112, textAlignVertical: 'top' },
  inputLocked: { backgroundColor: colors.surfaceSunken, borderColor: colors.borderSoft, color: colors.textSecondary },
  inputFocused: { borderColor: colors.focus, borderWidth: 2, paddingHorizontal: space.md + 1, paddingVertical: space.md - 1 },
  inputInvalid: { borderColor: colors.danger.solid, borderWidth: 2, paddingHorizontal: space.md + 1, paddingVertical: space.md - 1 },

  notice: { padding: space.md + 2, gap: space.md, borderRadius: radii.md, borderWidth: 1 },
  noticeText: { ...type.body, fontWeight: '500' },
  noticeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },

  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radii.lg,
    padding: space.xl,
    gap: space.md,
  },
  eyebrow: { ...type.eyebrow, color: colors.textMuted },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule, alignSelf: 'stretch' },
  ruleStrong: { height: 2, backgroundColor: colors.text, alignSelf: 'stretch' },

  metaList: { gap: space.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space.md, rowGap: 0 },
  metaLabel: { ...type.caption, color: colors.textMuted, width: 92 },
  metaValue: { ...type.body, color: colors.text, flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0 },
  metaMono: { ...type.mono, fontSize: 15, lineHeight: 22, color: colors.text },
  metaStrong: { fontWeight: '600' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xl, justifyContent: 'center' },
  loadingText: { ...type.body, color: colors.textSecondary },

  pageHeader: { gap: space.md },
  pageHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  backButton: { marginLeft: -space.md },
  pageHeaderCopy: { gap: space.xs },
  pageTitle: { ...type.title, color: colors.text },
  pageSubtitle: { ...type.body, color: colors.textSecondary, maxWidth: 560 },

  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  dialogFill: { flex: 1 },
  dialogScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  dialogCard: {
    width: '100%',
    maxWidth: layout.dialog,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderTopWidth: 4,
    padding: space.xl,
    gap: space.lg,
    boxShadow: '0 18px 48px rgba(21, 23, 28, 0.22)',
  },
  dialogTitleBlock: { gap: space.xs },
  dialogTitle: { ...type.heading, fontSize: 23, lineHeight: 29, color: colors.text },
});
