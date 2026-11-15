import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionRow, Button, DialogFrame, DialogTitle, TextField } from '@/components/common/ui';
import { LabSyncColors as colors, LabSyncRadii as radii, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';

const jakartaClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayLabel = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' });

export function jakartaNow() {
  const parts = Object.fromEntries(jakartaClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function firstOfMonth(date: Date, offset = 0) {
  const first = new Date(date.getTime());
  first.setUTCDate(1);
  first.setUTCMonth(first.getUTCMonth() + offset);
  return first;
}
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const durationChoices = [30, 60, 90, 120];
function nextDay(date: string) {
  const day = new Date(date + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() + 1);
  return isoDate(day);
}

const endOfDay = 23 * 60 + 59;
const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && isoDate(date) === value ? date : undefined;
}

function parseTime(value: string) {
  const parts = /^(\d{2}):(\d{2})$/.exec(value);
  if (!parts) return undefined;
  const hour = Number(parts[1]);
  const minute = Number(parts[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : undefined;
}

interface ScheduleFieldsProps {
  date: string;
  startTime: string;
  endTime: string;
  disabled: boolean;
  onDateChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function ScheduleFields({
  date, startTime, endTime, disabled, onDateChange, onStartChange, onEndChange,
}: ScheduleFieldsProps) {
  const [month, setMonth] = useState<Date>();
  const [draftDate, setDraftDate] = useState('');
  const [showDurations, setShowDurations] = useState(false);
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const duration = startMinutes !== undefined && endMinutes !== undefined ? endMinutes - startMinutes : 0;
  const parsedDate = parseDate(date);

  function useNow() {
    const now = jakartaNow();
    // Sessions must finish on the same calendar day.
    const atMidnight = now.minutes === endOfDay;
    const start = atMidnight ? 0 : now.minutes;
    onDateChange(atMidnight ? nextDay(now.date) : now.date);
    onStartChange(hhmm(start));
    onEndChange(hhmm(Math.min(endOfDay, start + 60)));
  }

  function pickDay(value: string) {
    onDateChange(value);
    setMonth(undefined);
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.heading}>Waktu sesi</Text>
        <Button compact variant="quiet" label="Mulai sekarang" disabled={disabled} onPress={useNow} />
      </View>
      <View style={styles.fields}>
        <View style={styles.dateField}>
          <Text style={styles.label}>Tanggal</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Buka kalender"
            accessibilityValue={{ text: date }} testID="session-date" disabled={disabled}
            onPress={() => {
              setDraftDate(date);
              setMonth(firstOfMonth(parsedDate ?? new Date(jakartaNow().date + 'T00:00:00Z')));
            }}
            style={({ pressed }) => [styles.dateControl, pressed && styles.datePressed]}>
            <Text style={styles.dateValue}>{parsedDate ? fullDate.format(parsedDate) : 'Pilih tanggal'}</Text>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dateArrow}>▾</Text>
          </Pressable>
        </View>
        <View style={styles.timeFields}>
          <TextField label="Mulai · WIB" accessibilityLabel="Jam Mulai" placeholder="08:00" mono
            value={startTime} onChangeText={onStartChange} editable={!disabled} maxLength={5} style={styles.timeField} />
          <TextField label="Selesai · WIB" accessibilityLabel="Jam Selesai" placeholder="10:00" mono
            value={endTime} onChangeText={onEndChange} editable={!disabled} maxLength={5} style={styles.timeField} />
        </View>
      </View>
      <View style={styles.durationRow}>
        <Text style={styles.durationText}>{duration > 0 ? 'Durasi ' + duration + ' menit' : 'Atur durasi'}</Text>
        <Button compact variant="quiet" label="Pilih durasi" disabled={disabled || startMinutes === undefined}
          onPress={() => setShowDurations(true)} />
      </View>
      <DialogFrame visible={!!month} onRequestClose={() => setMonth(undefined)}>
        <DialogTitle>Pilih tanggal</DialogTitle>
        <ActionRow>
          <Button compact label="Hari ini" onPress={() => pickDay(jakartaNow().date)} />
          <Button compact label="Besok" onPress={() => pickDay(nextDay(jakartaNow().date))} />
        </ActionRow>
        {month && <Calendar month={month} value={date} onMonthChange={setMonth} onPick={pickDay} />}
        <TextField label="Tanggal manual" placeholder="YYYY-MM-DD" value={draftDate} onChangeText={setDraftDate} maxLength={10} />
        <ActionRow>
          <Button compact label="Batal" onPress={() => setMonth(undefined)} />
          <Button compact variant="primary" label="Pakai tanggal" disabled={!parseDate(draftDate)} onPress={() => pickDay(draftDate)} />
        </ActionRow>
      </DialogFrame>
      <DialogFrame visible={showDurations} onRequestClose={() => setShowDurations(false)}>
        <DialogTitle>Pilih durasi</DialogTitle>
        <ActionRow>
          {durationChoices.map((minutes) => (
            <Button key={minutes} compact label={`${minutes} menit`}
              disabled={startMinutes === undefined || startMinutes + minutes > endOfDay}
              selected={duration === minutes}
              onPress={() => {
                if (startMinutes === undefined) return;
                onEndChange(hhmm(startMinutes + minutes));
                setShowDurations(false);
              }} />
          ))}
        </ActionRow>
        <Button compact variant="quiet" label="Batal" onPress={() => setShowDurations(false)} />
      </DialogFrame>
    </View>
  );
}

function Calendar({ month, value, onMonthChange, onPick }: {
  month: Date; value: string; onMonthChange: (date: Date) => void; onPick: (value: string) => void;
}) {
  const offset = (month.getUTCDay() + 6) % 7;
  const days = Math.round((firstOfMonth(month, 1).getTime() - month.getTime()) / 86_400_000);
  const weeks = Math.ceil((offset + days) / 7);

  return (
    <View style={styles.calendar}>
      <View style={styles.month}>
        <Button compact label="←" accessibilityLabel="Bulan sebelumnya" onPress={() => onMonthChange(firstOfMonth(month, -1))} />
        <Text accessibilityLiveRegion="polite" style={styles.monthTitle}>{monthLabel.format(month)}</Text>
        <Button compact label="→" accessibilityLabel="Bulan berikutnya" onPress={() => onMonthChange(firstOfMonth(month, 1))} />
      </View>
      <View style={styles.week}>
        {weekdays.map((label) => <Text key={label} style={styles.dayLabel}>{label}</Text>)}
      </View>
      {Array.from({ length: weeks }, (_, week) => (
        <View key={week} style={styles.week}>
          {Array.from({ length: 7 }, (_, index) => {
            const day = week * 7 + index - offset + 1;
            if (day < 1 || day > days) return <View key={index} style={styles.day} />;
            const picked = new Date(month.getTime());
            picked.setUTCDate(day);
            const iso = isoDate(picked);
            const selected = iso === value;
            return (
              <Pressable key={index} accessibilityRole="button" accessibilityLabel={dayLabel.format(picked)}
                accessibilityState={{ selected }} onPress={() => onPick(iso)} style={[styles.day, selected && styles.selectedDay]}>
                <Text style={[styles.dayNumber, selected && styles.selectedText]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, borderColor: colors.rule, paddingTop: space.lg, gap: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.xs },
  heading: { ...type.heading, color: colors.text },
  label: { ...type.label, color: colors.textSecondary },
  fields: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.md },
  dateField: { flexGrow: 1, flexShrink: 1, flexBasis: 175, minWidth: 0, gap: space.xs + 2 },
  dateControl: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    borderWidth: 1, borderColor: colors.borderDark, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  datePressed: { backgroundColor: colors.primarySurface },
  dateValue: { ...type.bodyStrong, color: colors.text, flexShrink: 1 },
  dateArrow: { color: colors.primary },
  timeFields: { flexDirection: 'row', flexWrap: 'wrap', flexGrow: 2, flexShrink: 1, flexBasis: 230, minWidth: 0, gap: space.md },
  timeField: { flexGrow: 1, flexShrink: 1, flexBasis: 105, minWidth: 0 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  durationText: { ...type.caption, color: colors.textSecondary },
  calendar: { gap: space.xs },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  monthTitle: { ...type.section, color: colors.text, textAlign: 'center', flexShrink: 1 },
  week: { flexDirection: 'row', gap: space.xxs },
  dayLabel: { ...type.caption, color: colors.textSecondary, textAlign: 'center', flex: 1, minWidth: 0 },
  day: { minHeight: 44, flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  dayNumber: { ...type.bodyStrong, color: colors.text },
  selectedDay: { backgroundColor: colors.primary },
  selectedText: { color: colors.surface },
});
