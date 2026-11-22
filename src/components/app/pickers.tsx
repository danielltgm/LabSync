import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Plus, UserPlus, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar, SearchField } from '@/components/app/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { User } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { addMonths, formatDate, fromDateTimeInput, isSameDay, monthGrid, monthName, startOfDay, startOfMonth, toDateInput } from '@/lib/format';
import { cn } from '@/lib/utils';

const WEEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export type DayMarks = Map<number, { count: number; live?: boolean }>;

/* ------------------------------------------------------------ MonthCalendar */

/**
 * Month grid, Monday first. Used by the Jadwal month view and the date picker.
 * `marks` puts dots under days that have sessions.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  marks,
  today,
  compact,
}: {
  month: number;
  onMonthChange: (month: number) => void;
  selected?: number;
  onSelect: (day: number) => void;
  marks?: DayMarks;
  today: number;
  compact?: boolean;
}) {
  const days = useMemo(() => monthGrid(month), [month]);
  const thisMonth = new Date(month).getMonth();
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const cell = compact ? 'h-10' : 'h-12';

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="font-display min-w-0 flex-1 text-[22px] font-extrabold uppercase leading-7">{monthName(month, { year: true })}</Text>
        {startOfMonth(today) !== startOfMonth(month) && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onMonthChange(startOfMonth(today));
              onSelect(startOfDay(today));
            }}
            className="bg-card active:bg-accent h-9 justify-center rounded-full px-3"
          >
            <Text className="text-xs font-bold">Hari ini</Text>
          </Pressable>
        )}
        <RoundButton icon={ChevronLeft} label="Bulan sebelumnya" onPress={() => onMonthChange(addMonths(month, -1))} />
        <RoundButton icon={ChevronRight} label="Bulan berikutnya" onPress={() => onMonthChange(addMonths(month, 1))} />
      </View>
      <View className="flex-row">
        {WEEK.map((d) => (
          <Text key={d} className="text-muted-foreground flex-1 text-center font-mono text-[10px] font-bold uppercase">
            {d}
          </Text>
        ))}
      </View>
      <View className="gap-1">
        {weeks.map((week) => (
          <View key={week[0]} className="flex-row gap-1">
            {week.map((day) => {
              const inMonth = new Date(day).getMonth() === thisMonth;
              const active = selected !== undefined && isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              const mark = marks?.get(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={formatDate(day, { weekday: true, year: true })}
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(day)}
                  className={cn(
                    'flex-1 items-center justify-center gap-0.5 rounded-2xl',
                    cell,
                    active ? 'bg-foreground' : isToday ? 'bg-card border-foreground border-2' : 'active:bg-accent',
                  )}
                >
                  <Text
                    className={cn(
                      'font-display text-lg font-extrabold leading-5',
                      active ? 'text-background' : inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    )}
                  >
                    {new Date(day).getDate()}
                  </Text>
                  <View className="h-1.5 flex-row gap-0.5">
                    {mark &&
                      Array.from({ length: Math.min(mark.count, 3) }, (_, i) => (
                        <View
                          key={i}
                          className={cn('size-1.5 rounded-full', mark.live && i === 0 ? 'bg-coral' : active ? 'bg-background' : 'bg-violet')}
                        />
                      ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: typeof ChevronLeft; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="bg-card active:bg-accent size-9 items-center justify-center rounded-full"
    >
      <Icon as={icon} className="size-4" strokeWidth={2.4} />
    </Pressable>
  );
}

/* ---------------------------------------------------------------- DateField */

/** A date "input" that opens a calendar. Value is YYYY-MM-DD (same as the old text field). */
export function DateField({
  label,
  value,
  onChange,
  marks,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  marks?: DayMarks;
}) {
  const today = useNow(60_000);
  const [open, setOpen] = useState(false);
  const ms = fromDateTimeInput(value, '00:00');
  const [month, setMonth] = useState(startOfMonth(ms));
  const [draft, setDraft] = useState(ms);
  return (
    <>
      <FieldButton
        label={label}
        icon={CalendarDays}
        value={formatDate(ms, { weekday: true, year: true, short: true })}
        onPress={() => {
          setDraft(ms);
          setMonth(startOfMonth(ms));
          setOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[94vw] max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <MonthCalendar month={month} onMonthChange={setMonth} selected={draft} onSelect={setDraft} marks={marks} today={today} compact />
          <DialogFooter>
            <Button
              className="h-12 rounded-2xl"
              onPress={() => {
                onChange(toDateInput(draft));
                setOpen(false);
              }}
            >
              <Icon as={Check} className="text-primary-foreground size-4" />
              <Text>{formatDate(draft, { weekday: true, short: true })}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------------------- TimeField */

/** Common practicum start times on campus (lab slots). */
const SLOTS = ['07:00', '08:00', '09:40', '10:00', '13:00', '13:30', '15:30', '16:25'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

/** A time "input" that opens a picker: lab slots, then hour and minute grids. Value is HH:MM. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h0, m0] = value.split(':').map(Number);
  const [hour, setHour] = useState(h0);
  const [minute, setMinute] = useState(m0);
  const draft = `${pad(hour)}:${pad(minute)}`;
  return (
    <>
      <FieldButton
        label={label}
        icon={Clock}
        value={value.replace(':', '.')}
        onPress={() => {
          setHour(h0);
          setMinute(m0);
          setOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[94vw] max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <Text className="font-display text-center text-[56px] font-extrabold leading-[60px]" style={{ fontVariant: ['tabular-nums'] }}>
            {draft.replace(':', '.')}
          </Text>
          <View className="gap-2">
            <Text className="text-muted-foreground font-mono text-[11px] font-bold uppercase">Slot lab</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {SLOTS.map((slot) => (
                <SmallChip
                  key={slot}
                  label={slot.replace(':', '.')}
                  active={draft === slot}
                  onPress={() => {
                    const [h, m] = slot.split(':').map(Number);
                    setHour(h);
                    setMinute(m);
                  }}
                />
              ))}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-muted-foreground font-mono text-[11px] font-bold uppercase">Jam</Text>
            <ChipGrid items={HOURS} cols={8} active={hour} onPress={setHour} />
          </View>
          <View className="gap-2">
            <Text className="text-muted-foreground font-mono text-[11px] font-bold uppercase">Menit</Text>
            <ChipGrid items={MINUTES} cols={6} active={minute} onPress={setMinute} />
          </View>
          <DialogFooter>
            <Button
              className="h-12 rounded-2xl"
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              <Icon as={Check} className="text-primary-foreground size-4" />
              <Text>Pakai {draft.replace(':', '.')}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChipGrid({ items, cols, active, onPress }: { items: number[]; cols: number; active: number; onPress: (n: number) => void }) {
  const rows = Array.from({ length: Math.ceil(items.length / cols) }, (_, i) => items.slice(i * cols, i * cols + cols));
  return (
    <View className="gap-1.5">
      {rows.map((row) => (
        <View key={row[0]} className="flex-row gap-1.5">
          {row.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: n === active }}
              onPress={() => onPress(n)}
              className={cn('h-9 flex-1 items-center justify-center rounded-xl', n === active ? 'bg-foreground' : 'bg-muted active:bg-accent')}
            >
              <Text className={cn('font-mono text-[13px] font-bold', n === active ? 'text-background' : 'text-foreground')}>{pad(n)}</Text>
            </Pressable>
          ))}
          {row.length < cols && Array.from({ length: cols - row.length }, (_, i) => <View key={`pad-${i}`} className="flex-1" />)}
        </View>
      ))}
    </View>
  );
}

function SmallChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn('h-9 justify-center rounded-full px-3.5', active ? 'bg-foreground' : 'bg-muted active:bg-accent')}
    >
      <Text className={cn('font-mono text-[13px] font-bold', active ? 'text-background' : 'text-foreground')}>{label}</Text>
    </Pressable>
  );
}

function FieldButton({ label, icon, value, onPress }: { label: string; icon: typeof Clock; value: string; onPress: () => void }) {
  return (
    <View className="min-w-0 flex-1 gap-2">
      <Text className="text-sm font-medium">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        className="bg-card border-input active:bg-accent h-12 flex-row items-center gap-2.5 rounded-2xl border px-3.5"
      >
        <Icon as={icon} className="text-muted-foreground size-4" />
        <Text className="min-w-0 flex-1 text-[15px] font-semibold" numberOfLines={1}>
          {value}
        </Text>
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------- PeoplePicker */

const NIM = /^\d{8,18}$/;

/**
 * Search people by name or NIM and collect them as chips.
 * Enter adds the top match. Typing or pasting NIMs separated by space, comma or new line adds each one.
 */
export function PeoplePicker({
  candidates,
  taken,
  takenLabel = 'Sudah terdaftar',
  value,
  onChange,
  placeholder = 'Ketik nama atau NIM, Enter untuk tambah',
  allowNewNim,
}: {
  candidates: User[];
  /** NIMs that can't be picked (already in the class). */
  taken?: Set<string>;
  takenLabel?: string;
  value: string[];
  onChange: (nims: string[]) => void;
  placeholder?: string;
  /** Unknown NIMs can be added (an account is created for them). */
  allowNewNim?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const byNim = useMemo(() => new Map(candidates.map((u) => [u.nim, u])), [candidates]);
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return candidates
      .filter((u) => u.name.toLowerCase().includes(q) || u.nim.includes(q))
      .sort((a, b) => Number(taken?.has(a.nim) ?? false) - Number(taken?.has(b.nim) ?? false) || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [candidates, q, taken]);
  const pickable = (nim: string) => !value.includes(nim) && !taken?.has(nim);
  const newNim = allowNewNim && NIM.test(q) && !byNim.has(q) && !value.includes(q) ? q : null;

  const add = (nims: string[]) => {
    const next = [...value];
    let skipped = 0;
    for (const nim of nims) {
      if (!byNim.has(nim) && !allowNewNim) skipped++;
      else if (pickable(nim) && !next.includes(nim)) next.push(nim);
      else skipped++;
    }
    onChange(next);
    setNote(skipped ? `${skipped} dilewati (sudah ada atau NIM tidak dikenal)` : '');
  };

  const onText = (text: string) => {
    // NIM list typed or pasted: space / comma / newline commits each complete NIM.
    if (/[\s,;]$/.test(text) || /[\s,;]/.test(text.trim())) {
      const tokens = text.split(/[\s,;]+/).filter(Boolean);
      if (tokens.length && tokens.every((t) => /^\d+$/.test(t))) {
        const done = /[\s,;]$/.test(text) ? tokens : tokens.slice(0, -1);
        const rest = /[\s,;]$/.test(text) ? '' : tokens[tokens.length - 1];
        const valid = done.filter((t) => NIM.test(t));
        if (valid.length) {
          add(valid);
          setQuery(rest);
          return;
        }
      }
    }
    setNote('');
    setQuery(text);
  };

  const submit = () => {
    const top = matches.find((u) => pickable(u.nim));
    if (top) add([top.nim]);
    else if (newNim) add([newNim]);
    else return;
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <View className="gap-2">
      {value.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {value.map((nim) => {
            const u = byNim.get(nim);
            return (
              <View key={nim} className="bg-foreground h-9 flex-row items-center gap-1.5 rounded-full pl-1 pr-1">
                <Avatar name={u?.name ?? nim} size="sm" className="size-7" />
                <Text className="text-background max-w-40 text-[13px] font-bold" numberOfLines={1}>
                  {u ? u.name.split(' ').slice(0, 2).join(' ') : nim}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Hapus ${u?.name ?? nim}`}
                  hitSlop={6}
                  onPress={() => onChange(value.filter((n) => n !== nim))}
                  className="size-7 items-center justify-center rounded-full"
                >
                  <Icon as={X} className="text-background size-3.5" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
      <SearchField
        value={query}
        onChangeText={onText}
        placeholder={placeholder}
        inputRef={inputRef}
        inputProps={{
          onSubmitEditing: submit,
          submitBehavior: 'submit',
          returnKeyType: 'done',
          autoCorrect: false,
          autoCapitalize: 'words',
        }}
      />
      {!!note && <Text className="text-warning-ink text-xs font-medium">{note}</Text>}
      {(matches.length > 0 || newNim) && (
        <View className="bg-card overflow-hidden rounded-3xl">
          {matches.map((u, i) => {
            const isTaken = taken?.has(u.nim);
            const picked = value.includes(u.nim);
            return (
              <Pressable
                key={u.nim}
                accessibilityRole="button"
                disabled={isTaken || picked}
                onPress={() => {
                  add([u.nim]);
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className={cn('active:bg-accent flex-row items-center gap-3 px-4 py-2.5', i > 0 && 'border-border border-t')}
              >
                <Avatar name={u.name} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text className={cn('text-[15px] font-medium', (isTaken || picked) && 'text-muted-foreground')} numberOfLines={1}>
                    <Highlight text={u.name} query={q} />
                  </Text>
                  <Text className="text-muted-foreground font-mono text-xs">
                    <Highlight text={u.nim} query={q} />
                  </Text>
                </View>
                {isTaken ? (
                  <Text className="text-muted-foreground text-xs">{takenLabel}</Text>
                ) : picked ? (
                  <Icon as={Check} className="text-success-ink size-4" />
                ) : (
                  <View className="bg-muted size-8 items-center justify-center rounded-full">
                    <Icon as={i === 0 ? UserPlus : Plus} className="size-4" />
                  </View>
                )}
              </Pressable>
            );
          })}
          {newNim && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                add([newNim]);
                setQuery('');
              }}
              className={cn('active:bg-accent flex-row items-center gap-3 px-4 py-3', matches.length > 0 && 'border-border border-t')}
            >
              <View className="bg-mustard size-8 items-center justify-center rounded-full">
                <Icon as={Plus} className="text-on-bright size-4" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-medium">NIM baru {newNim}</Text>
                <Text className="text-muted-foreground text-xs">Akun dibuat, nama dilengkapi saat praktikan login</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}
      {!q && !value.length && <Text className="text-muted-foreground text-xs">Bisa tempel banyak NIM sekaligus dari Excel.</Text>}
    </View>
  );
}

/** Bold the part of `text` that matches the search. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <Text className="bg-mustard/60 font-bold">{text.slice(i, i + query.length)}</Text>
      {text.slice(i + query.length)}
    </>
  );
}
