import { router } from 'expo-router';
import { ArrowLeft, ArrowUpRight } from 'lucide-react-native';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, View, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useLayout } from '@/hooks/use-layout';
import { usePrefs, type BarPlacement } from '@/hooks/use-prefs';
import { cn } from '@/lib/utils';

export const TAB_BAR_SPACE = 112;
/** Room the side rail takes on wide screens (12 margin + 84 rail + 8 gap). See tab-bar.tsx. */
export const RAIL_SPACE = 104;

/**
 * How wide the content column may grow on tablets/desktop. Phones always use the full width.
 * narrow: forms and detail pages. medium: lists. wide: dashboards with columns.
 */
export type ScreenWidth = 'narrow' | 'medium' | 'wide';
const MAX_W: Record<ScreenWidth, string> = { narrow: 'max-w-2xl', medium: 'max-w-4xl', wide: 'max-w-6xl' };
const WidthContext = createContext<ScreenWidth>('narrow');

/** Content column classes for the current screen: max width plus side padding. */
export function useColumnClass() {
  const width = useContext(WidthContext);
  const { wide } = useLayout();
  return cn('w-full self-center', MAX_W[width], wide ? 'px-6' : 'px-4');
}

/** A view aligned with the screen's content column (for custom headers). `flush` drops the side padding. */
export function Column({ children, className, flush }: { children: ReactNode; className?: string; flush?: boolean }) {
  const column = useColumnClass();
  return <View className={cn(column, flush && 'px-0', className)}>{children}</View>;
}

/**
 * Where the navigation sits right now: the bottom bar on phones, and on tablets / desktop
 * whatever the user picked in Profil (rail on the left or right, or a bottom bar).
 */
export function useBarPlacement(): 'phone' | BarPlacement {
  const { wide } = useLayout();
  const { barPlacement } = usePrefs();
  return wide ? barPlacement : 'phone';
}

/** Insets that keep content clear of the tab bar or side rail. */
export function useTabInsets(tabs: boolean) {
  const insets = useSafeAreaInsets();
  const place = useBarPlacement();
  return {
    left: tabs && place === 'left' ? RAIL_SPACE : 0,
    right: tabs && place === 'right' ? RAIL_SPACE : 0,
    bottom: (tabs && (place === 'phone' || place === 'bottom') ? TAB_BAR_SPACE : 32) + insets.bottom,
  };
}

/** Scrollable page with a centered readable column. */
export function Screen({
  children,
  className,
  contentClassName,
  tabs = false,
  header,
  scroll = true,
  width,
  ...props
}: ScrollViewProps & {
  children: ReactNode;
  contentClassName?: string;
  /** Leaves room for the floating tab bar. */
  tabs?: boolean;
  header?: ReactNode;
  scroll?: boolean;
  /** Max content width on wide screens. Defaults to wide for tab roots, narrow for pushed pages. */
  width?: ScreenWidth;
}) {
  return (
    <WidthContext.Provider value={width ?? (tabs ? 'wide' : 'narrow')}>
      <ScreenBody {...props} className={className} contentClassName={contentClassName} tabs={tabs} header={header} scroll={scroll}>
        {children}
      </ScreenBody>
    </WidthContext.Provider>
  );
}

function ScreenBody({
  children,
  className,
  contentClassName,
  tabs,
  header,
  scroll,
  ...props
}: ScrollViewProps & { children: ReactNode; contentClassName?: string; tabs: boolean; header?: ReactNode; scroll: boolean }) {
  const insets = useSafeAreaInsets();
  const { left, right, bottom } = useTabInsets(tabs);
  const column = useColumnClass();
  if (!scroll) {
    return (
      <View className={cn('bg-background flex-1', className)} style={{ paddingTop: header ? 0 : insets.top, paddingLeft: left, paddingRight: right }}>
        {header}
        <View className={cn(column, 'flex-1', contentClassName)} style={{ paddingBottom: bottom }}>
          {children}
        </View>
      </View>
    );
  }
  return (
    <View className={cn('bg-background flex-1', className)} style={{ paddingLeft: left }}>
      {/* Right rail: the room goes inside (header wrapper, scroll content), not on this container,
          so the scroll view still reaches the window edge and its web scrollbar sits there. */}
      {right ? <View style={{ paddingRight: right }}>{header}</View> : header}
      {/* Android is edge-to-edge, so the window never resizes for the keyboard: this scroll view
          pads itself and scrolls the focused input above the keyboard (no-op on web). */}
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: header ? 8 : insets.top + 12, paddingBottom: bottom, paddingRight: right }}
        {...props}
      >
        <View className={cn(column, 'gap-6', contentClassName)}>{children}</View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Top bar for pushed (non-tab) screens. */
export function PageHeader({
  title,
  subtitle,
  right,
  back = true,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: boolean;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const column = useColumnClass();
  return (
    <View className="bg-background" style={{ paddingTop: insets.top }}>
      <View className={cn(column, 'min-h-16 flex-row items-center gap-3 py-2')}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={8}
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
            className="bg-card active:bg-accent size-11 items-center justify-center rounded-full"
          >
            <Icon as={ArrowLeft} className="size-5" strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View className="w-0" />
        )}
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[28px] font-extrabold uppercase leading-8" numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text className="text-muted-foreground font-mono text-[11px]" numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
      </View>
    </View>
  );
}

/** Large title used on tab roots. */
export function TabTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        {!!eyebrow && <Text className="text-muted-foreground font-mono text-[12px] font-bold uppercase">{eyebrow}</Text>}
        <Text className="font-display text-[48px] font-extrabold uppercase leading-[48px]" role="heading">{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('gap-3', className)}>
      {(title || action) && (
        <View className="min-h-6 flex-row items-center justify-between gap-2">
          {!!title && <Text className="font-display text-[22px] font-extrabold uppercase leading-6">{title}</Text>}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function LinkAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <View className="bg-card flex-row items-center gap-1 rounded-full py-1.5 pl-3 pr-2">
        <Text className="text-[13px] font-bold">{label}</Text>
        <Icon as={ArrowUpRight} className="size-4" strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

/** Back that still works when the screen was opened directly (web deep link). */
export function goBack(fallback: '/' | '/izin' | '/lab' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
