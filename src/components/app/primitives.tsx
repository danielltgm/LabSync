import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type PressableProps, type TextInput, type TextInputProps } from 'react-native';

import { Mascot, type MascotMood } from '@/components/app/mascot';
import { TONE_CLASSES, type Tone } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useLayout } from '@/hooks/use-layout';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------- Surface */

export function Surface({ className, children, ...props }: { className?: string; children: ReactNode } & React.ComponentProps<typeof View>) {
  return (
    <View className={cn('bg-card rounded-[28px]', className)} {...props}>
      {children}
    </View>
  );
}

/* --------------------------------------------------------------- Layout */

/**
 * Two columns from SPLIT_MIN (main 3/5, side 2/5), stacked main-then-side below that.
 * When the stacked order should differ, branch on useLayout().split in the screen instead.
 */
export function Columns({ main, side, className }: { main: ReactNode; side: ReactNode; className?: string }) {
  const { split } = useLayout();
  if (!split) {
    return (
      <>
        {main}
        {side}
      </>
    );
  }
  return (
    <View className={cn('flex-row items-start gap-6', className)}>
      <View className="min-w-0 gap-6" style={{ flex: 3 }}>{main}</View>
      <View className="min-w-0 gap-6" style={{ flex: 2 }}>{side}</View>
    </View>
  );
}

/** Card grid: 1 column on phones, 2 on tablets, 3 on large screens (or a fixed `cols`). Rows stay aligned. */
export function Grid({ children, cols, gap = 'gap-3' }: { children: ReactNode; cols?: number; gap?: 'gap-3' | 'gap-4' }) {
  const layout = useLayout();
  const n = Math.max(1, Math.min(cols ?? layout.cols, layout.cols));
  const items = Children.toArray(children);
  if (n === 1) return <View className={gap}>{items}</View>;
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return (
    <View className={gap}>
      {rows.map((row, r) => (
        <View key={r} className={cn('flex-row items-stretch', gap)}>
          {row.map((item, c) => (
            <View key={c} className="min-w-0 flex-1">{item}</View>
          ))}
          {Array.from({ length: n - row.length }, (_, k) => <View key={`pad-${k}`} className="flex-1" />)}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------- IconTile */

export function IconTile({ icon, tone = 'brand', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const t = TONE_CLASSES[tone];
  const box = size === 'lg' ? 'size-14 rounded-2xl' : size === 'sm' ? 'size-8 rounded-xl' : 'size-11 rounded-2xl';
  const glyph = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5';
  return (
    <View className={cn('items-center justify-center', box, t.bright, className)}>
      <Icon as={icon} className={cn(glyph, t.onBright)} strokeWidth={2.4} />
    </View>
  );
}

/* ------------------------------------------------------------- StatTile */

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  onPress,
  bright,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  onPress?: () => void;
  /** Loud poster block in the tone's accent color. */
  bright?: boolean;
  className?: string;
}) {
  const t = TONE_CLASSES[tone];
  const fg = bright ? t.onBright : 'text-foreground';
  const sub = bright ? cn(t.onBright, 'opacity-70') : 'text-muted-foreground';
  const Body = (
    <>
      {/* Icon gets its own row: tiles are often 3 across on a phone, too narrow for label + icon side by side. */}
      {icon && (
        <View className="mb-1.5">
          {bright ? <Icon as={icon} className={cn('size-5', fg)} strokeWidth={2.4} /> : <IconTile icon={icon} tone={tone} size="sm" />}
        </View>
      )}
      <Text className={cn('font-mono text-[11px] font-bold uppercase', sub)} numberOfLines={1}>{label}</Text>
      <Text
        // Long values ("100%", "26/26") get a smaller size: adjustsFontSizeToFit does nothing on web.
        className={cn('font-display font-extrabold', String(value).length >= 4 ? 'text-[30px] leading-[44px]' : 'text-[40px] leading-[44px]', fg)}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {value}
      </Text>
      {!!hint && <Text className={cn('text-xs font-medium', sub)} numberOfLines={1}>{hint}</Text>}
    </>
  );
  const base = cn('min-w-0 flex-1 gap-0.5 rounded-[24px] p-4', bright ? t.bright : 'bg-card', className);
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} className={cn(base, 'active:opacity-85')}>{Body}</Pressable>
  ) : (
    <View className={base}>{Body}</View>
  );
}

/* -------------------------------------------------------------- ListRow */

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron = !!onPress,
  className,
  ...props
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  className?: string;
} & Omit<PressableProps, 'children'>) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className={cn('min-h-14 flex-row items-center gap-3 px-4 py-3', onPress && 'active:bg-accent', className)}
      {...props}
    >
      {leading}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold" numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text className="text-muted-foreground text-[13px]" numberOfLines={2}>{subtitle}</Text>}
      </View>
      {trailing}
      {chevron && <Icon as={ChevronRight} className="text-muted-foreground size-4" />}
    </Pressable>
  );
}

export function RowGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <Surface className={cn('overflow-hidden', className)}>{children}</Surface>;
}

export function RowDivider() {
  return <View className="bg-foreground/10 mx-4 h-px" />;
}

/* --------------------------------------------------------------- Avatar */

const HUES = ['bg-violet', 'bg-sage', 'bg-mustard', 'bg-aqua', 'bg-coral'];
const INKS = ['text-white', 'text-on-bright', 'text-on-bright', 'text-on-bright', 'text-on-bright'];

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const i = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % HUES.length;
  const box = { sm: 'size-8', md: 'size-10', lg: 'size-14', xl: 'size-20' }[size];
  const text = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' }[size];
  return (
    <View className={cn('items-center justify-center rounded-full', box, HUES[i], className)}>
      <Text className={cn('font-display font-extrabold', text, INKS[i])}>{initials(name)}</Text>
    </View>
  );
}

/* ----------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  mood = 'empty',
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  mood?: MascotMood;
  className?: string;
}) {
  return (
    <View className={cn('items-center gap-3 rounded-3xl px-6 py-8', className)}>
      <View>
        <Mascot mood={mood} size={96} />
        <View className="bg-ink absolute -right-2 bottom-3 size-9 items-center justify-center rounded-full">
          <Icon as={icon} className="text-ink-foreground size-4" strokeWidth={2.4} />
        </View>
      </View>
      <View className="items-center gap-1">
        <Text className="font-display text-center text-2xl font-extrabold uppercase leading-7">{title}</Text>
        {!!body && <Text className="text-muted-foreground max-w-xs text-center text-sm leading-5">{body}</Text>}
      </View>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
}

/* ----------------------------------------------------------- Segmented */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  const { width } = useLayout();
  // More than four options don't fit a phone; scroll sideways instead of truncating labels.
  const crowded = options.length > 4 && width > 0 && width < 560;
  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={o.value}
        role="tab"
        aria-selected={active}
        onPress={() => onChange(o.value)}
        className={cn('flex-row items-center justify-center gap-1.5 rounded-full py-2.5', crowded ? 'px-4' : 'flex-1 px-2', active && 'bg-foreground')}
      >
        <Text className={cn('text-[13px] font-bold', active ? 'text-background' : 'text-muted-foreground')} numberOfLines={1}>
          {o.label}
        </Text>
        {o.count !== undefined && o.count > 0 && (
          <View className={cn('min-w-5 items-center rounded-full px-1.5', active ? 'bg-coral' : 'bg-foreground/10')}>
            <Text className={cn('text-[11px] font-bold', active ? 'text-on-bright' : 'text-muted-foreground')}>{o.count}</Text>
          </View>
        )}
      </Pressable>
    );
  });
  if (crowded) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className={cn('bg-foreground/5 grow-0 rounded-full', className)} contentContainerClassName="p-1" role="tablist">
        {items}
      </ScrollView>
    );
  }
  return (
    <View className={cn('bg-foreground/5 flex-row rounded-full p-1', className)} role="tablist">
      {items}
    </View>
  );
}

/* ---------------------------------------------------------------- Chips */

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: LucideIcon }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        'h-10 flex-row items-center gap-1.5 rounded-full px-4',
        active ? 'bg-foreground' : 'bg-card active:bg-accent',
      )}
    >
      {icon && <Icon as={icon} className={cn('size-4', active ? 'text-background' : 'text-muted-foreground')} />}
      <Text className={cn('text-[13px] font-bold', active ? 'text-background' : 'text-foreground')}>{label}</Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------- SearchField */

/** Pill search box. The icon sits in the row (not absolutely positioned), so it lines up on every platform. */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Cari',
  className,
  inputProps,
  inputRef,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra TextInput props (onSubmitEditing, autoFocus…). */
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'className'>;
  inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>;
}) {
  return (
    <View className={cn('bg-card border-input h-12 min-w-0 flex-row items-center gap-2 rounded-full border pl-4 pr-1.5', className)}>
      <Icon as={Search} className="text-muted-foreground size-4" />
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        // Input's ref type is an intersection of two TextInput typings; the instance is the same at runtime.
        ref={inputRef as never}
        {...inputProps}
        className="h-full w-auto flex-1 rounded-none border-0 bg-transparent px-0 focus-visible:ring-0"
      />
      {!!value && (
        <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian" hitSlop={8} onPress={() => onChangeText('')} className="bg-foreground/10 size-8 items-center justify-center rounded-full">
          <Icon as={X} className="text-muted-foreground size-3.5" />
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------- MetaLine */

export function MetaLine({ icon, children, className, tone }: { icon: LucideIcon; children: ReactNode; className?: string; tone?: string }) {
  return (
    <View className={cn('flex-row items-center gap-2', className)}>
      <Icon as={icon} className={cn('text-muted-foreground size-4', tone)} />
      <Text className={cn('text-muted-foreground min-w-0 flex-1 text-sm', tone)} numberOfLines={1}>{children}</Text>
    </View>
  );
}

/* --------------------------------------------------------- ProgressRing */

/** Thin bar meter, works everywhere without SVG math. */
export function Meter({ value, tone = 'brand', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <View className={cn('bg-foreground/10 h-2.5 overflow-hidden rounded-full', className)}>
      <View className={cn('h-full rounded-full', TONE_CLASSES[tone].solid)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </View>
  );
}

export function StackedMeter({ parts, className }: { parts: { value: number; tone: Tone }[]; className?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <View className={cn('bg-foreground/10 h-3 flex-row gap-0.5 overflow-hidden rounded-full', className)}>
      {parts.filter((p) => p.value > 0).map((p, i) => (
        <View key={i} className={cn('h-full', TONE_CLASSES[p.tone].solid)} style={{ width: `${(p.value / total) * 100}%` }} />
      ))}
    </View>
  );
}
