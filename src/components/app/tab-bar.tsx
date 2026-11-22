import type { TabTriggerSlotProps } from 'expo-router/ui';
import { House, User } from 'lucide-react-native';
import { Children, forwardRef, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBarPlacement } from '@/components/app/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { centerIcon, SLOT_META, useNavSlots } from '@/data/nav';
import { attendanceFor, classesForUser, sessionsForUser } from '@/data/selectors';
import { useStore, useUnreadCount } from '@/data/store';
import type { NavSlot } from '@/data/types';
import { cn } from '@/lib/utils';

type RNView = React.ComponentRef<typeof View>;

export type TabName = 'index' | 'profil' | NavSlot;

const FIXED = {
  index: { label: 'Beranda', icon: House },
  profil: { label: 'Profil', icon: User },
} as const;

const metaOf = (tab: TabName) => (tab === 'index' || tab === 'profil' ? FIXED[tab] : SLOT_META[tab]);

/**
 * Bar order: Beranda · slot · centre slot · slot · Profil (Profil is always the far right).
 * The three slots are the user's choice (Profil → Bottom bar, or "Atur" on Beranda).
 * Every route stays registered in the navigator (hidden triggers render nothing), so deep links
 * and router.push still work. Screens guard their own access.
 */
function useVisibleTabs(): TabName[] {
  const slots = useNavSlots();
  return ['index', ...slots, 'profil'];
}

/** Puts the triggers in the bar's order (the layout declares them once, in a fixed order). */
function ordered(children: ReactNode, tabs: TabName[]) {
  const rank = (child: ReactNode) => {
    const name = isValidElement<{ name?: string }>(child) ? child.props.name : undefined;
    const i = tabs.indexOf(name as TabName);
    return i === -1 ? tabs.length : i;
  };
  return Children.toArray(children).sort((a, b) => rank(a) - rank(b));
}

export const TabBar = forwardRef<RNView, ViewProps & { children: ReactNode }>(function TabBar({ children, style, ...props }, ref) {
  const { me } = useStore();
  return me ? (
    <SignedInBar ref={ref} style={style} {...props}>
      {children}
    </SignedInBar>
  ) : null;
});

/** Rail (left/right on tablets) or bar (phones, or tablets that picked "Bawah"). */
function useRail() {
  const place = useBarPlacement();
  return { place, rail: place === 'left' || place === 'right', wideBar: place === 'bottom' };
}

const SignedInBar = forwardRef<RNView, ViewProps & { children: ReactNode }>(function SignedInBar({ children, style, ...props }, ref) {
  const insets = useSafeAreaInsets();
  const { place, rail, wideBar } = useRail();
  const items = ordered(children, useVisibleTabs());
  if (rail) {
    // Tablets / desktop: a vertical rail on the left or right instead of a bar over the content.
    // Width must stay in sync with RAIL_SPACE in screen.tsx.
    return (
      <View
        pointerEvents="box-none"
        className={cn('absolute bottom-0 top-0 justify-center', place === 'right' ? 'right-0 pr-3' : 'left-0 pl-3')}
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}
      >
        <View
          ref={ref}
          {...props}
          // TabList injects a row layout style; the rail is a column, so override it after.
          style={[style, { flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }]}
          className="bg-ink w-[84px] gap-1 rounded-[42px] px-1.5 py-3 shadow-xl shadow-black/25"
        >
          {items}
        </View>
      </View>
    );
  }
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 items-center px-4" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <View
        ref={ref}
        {...props}
        style={style}
        className={cn('bg-ink w-full flex-row items-center rounded-full px-2 shadow-xl shadow-black/25', wideBar ? 'h-[76px] max-w-xl' : 'h-[72px] max-w-md')}
      >
        {items}
      </View>
    </View>
  );
});

export const TabButton = forwardRef<RNView, TabTriggerSlotProps & { tab: TabName }>(function TabButton(props, ref) {
  const { me } = useStore();
  return me ? <SignedInButton ref={ref} {...props} /> : null;
});

const SignedInButton = forwardRef<RNView, TabTriggerSlotProps & { tab: TabName }>(function SignedInButton(props, ref) {
  const tabs = useVisibleTabs();
  if (!tabs.includes(props.tab)) return null;
  if (props.tab === tabs[2]) return <CenterButton ref={ref} {...props} slot={props.tab as NavSlot} />;
  return <SideButton ref={ref} {...props} />;
});

const SideButton = forwardRef<RNView, TabTriggerSlotProps & { tab: TabName }>(function SideButton({ tab, isFocused, ...props }, ref) {
  const meta = metaOf(tab);
  const { rail, wideBar } = useRail();
  if (rail) {
    return (
      <Pressable ref={ref} accessibilityRole="tab" accessibilityLabel={meta.label} accessibilityState={{ selected: isFocused }} {...props} className="w-full">
        {/* flex-1: TabTrigger makes the Pressable a row, so the column must fill it to be centered. */}
        <View className="flex-1 items-center gap-0.5 py-1.5">
          <ActiveIcon tab={tab} focused={!!isFocused} />
          <Text className={cn('font-mono text-[10px] font-bold', isFocused ? 'text-ink-foreground' : 'text-ink-muted')} numberOfLines={1}>
            {meta.label}
          </Text>
        </View>
      </Pressable>
    );
  }
  return (
    // TabTrigger injects a row layout style, so the column lives on an inner view.
    <Pressable ref={ref} accessibilityRole="tab" accessibilityLabel={meta.label} accessibilityState={{ selected: isFocused }} {...props} className="h-full flex-1">
      <View className="flex-1 items-center justify-center">
        <ActiveIcon tab={tab} focused={!!isFocused} />
        {/* Tablets have room for labels under the icons. */}
        {wideBar && (
          <Text className={cn('-mt-1 font-mono text-[10px] font-bold', isFocused ? 'text-ink-foreground' : 'text-ink-muted')} numberOfLines={1}>
            {meta.label}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

/**
 * Icon with the round aqua highlight when selected. The highlight is its own `rounded-full` view
 * (same as the bell and avatar buttons, which render round on Android); a style-only borderRadius
 * on the icon's container came out square on device.
 */
function ActiveIcon({ tab, focused }: { tab: TabName; focused: boolean }) {
  const meta = metaOf(tab);
  return (
    <View className="size-12 items-center justify-center">
      {focused && <View className="bg-aqua absolute inset-0 overflow-hidden rounded-full" />}
      {/* Own view so the icon stacks above the absolute highlight on web too (positioned elements paint first otherwise). */}
      <View>
        <Icon as={meta.icon} className={cn('size-[22px]', focused ? 'text-on-bright' : 'text-ink-muted')} strokeWidth={2.4} />
      </View>
      {tab === 'profil' && <UnreadDot />}
      {tab === 'izin' && <PendingLeaveDot />}
      {tab === 'presensi' && <OpenSessionDot />}
    </View>
  );
}

function Dot() {
  return <View className="bg-coral border-ink absolute right-0.5 top-0.5 size-3.5 rounded-full border-2" />;
}

function UnreadDot() {
  const unread = useUnreadCount();
  return unread ? <Dot /> : null;
}

/** Staff: leaves in their classes waiting for a decision. */
function PendingLeaveDot() {
  const { state, me } = useStore();
  if (!me || me.role === 'PRAKTIKAN') return null;
  const classIds = new Set(classesForUser(state, me).map((c) => c.id));
  const pending = state.leaves.some((l) => l.decision === 'pending' && classIds.has(state.sessions.find((s) => s.id === l.sessionId)?.classId ?? ''));
  return pending ? <Dot /> : null;
}

/** A session is open (and, for students, not checked in yet). */
function useOpenSession() {
  const { state, me } = useStore();
  if (!me) return false;
  const isStudent = me.role === 'PRAKTIKAN';
  return sessionsForUser(state, me).some((s) => s.status === 'DIBUKA' && (isStudent ? !attendanceFor(state, s.id, me.nim) : true));
}

function OpenSessionDot() {
  return useOpenSession() ? <Dot /> : null;
}

const CenterButton = forwardRef<RNView, TabTriggerSlotProps & { slot: NavSlot }>(function CenterButton({ isFocused, slot, ...props }, ref) {
  const { me } = useStore();
  const { rail: wide } = useRail();
  const open = useOpenSession();
  const meta = SLOT_META[slot];
  const glyph = centerIcon(slot, me!.role);
  const pending = slot === 'presensi' && open;

  return (
    <Pressable ref={ref} accessibilityRole="tab" accessibilityLabel={meta.label} accessibilityState={{ selected: isFocused }} {...props} className={wide ? 'w-full' : 'h-full flex-1'}>
      <View className={wide ? 'flex-1 items-center gap-0.5 py-2' : 'flex-1 items-center justify-center'}>
        <View className={cn('border-ink items-center justify-center rounded-full border-[5px]', wide ? 'size-[64px]' : '-mt-8 size-[70px]', isFocused ? 'bg-mustard' : 'bg-coral')}>
          <Icon as={glyph} className="text-on-bright size-7" strokeWidth={2.6} />
          {pending && <View className="bg-aqua border-ink absolute -right-0.5 -top-0.5 size-5 rounded-full border-[3px]" />}
          {slot === 'izin' && <PendingLeaveDot />}
        </View>
        {wide && (
          <Text className={cn('font-mono text-[10px] font-bold', isFocused ? 'text-ink-foreground' : 'text-ink-muted')} numberOfLines={1}>
            {meta.label}
          </Text>
        )}
      </View>
    </Pressable>
  );
});
