import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { MaterialsEditor } from "@/components/app/materials-editor";
import { DateField, TimeField } from "@/components/app/pickers";
import { Chip } from "@/components/app/primitives";
import { RichTextEditor } from "@/components/app/rich-text";
import { Section } from "@/components/app/screen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import type { ClassGroup, Course, Lab, Material } from "@/data/types";
import { useNow } from "@/hooks/use-now";
import {
  DAY,
  formatDate,
  fromDateTimeInput,
  MINUTE,
  startOfDay,
  toDateInput,
  toTimeInput,
  weekdayName,
} from "@/lib/format";

export interface SessionFormValue {
  classId: string;
  topic: string;
  description: string;
  date: string;
  time: string;
  durationMin: number;
  labId: string;
  lateAfterMin: number;
  repeatWeeks: number;
  changeNote: string;
  materials: Material[];
}

export function sessionFormDefaults(
  cls?: ClassGroup,
  now = Date.now(),
): SessionFormValue {
  let day = startOfDay(now);
  if (cls) {
    while (new Date(day).getDay() !== cls.weekday || day < startOfDay(now))
      day += DAY;
  }
  return {
    classId: cls?.id ?? "",
    topic: "",
    description: "",
    date: toDateInput(day),
    time: cls?.startTime ?? "08:00",
    durationMin: 120,
    labId: cls?.labId ?? "",
    lateAfterMin: 15,
    repeatWeeks: 1,
    changeNote: "",
    materials: [],
  };
}

export function SessionForm({
  value,
  onChange,
  classes,
  courses,
  labs,
  mode,
  onSubmit,
  submitLabel,
  scheduleChanged,
  contentOnly,
}: {
  value: SessionFormValue;
  onChange: (v: SessionFormValue) => void;
  classes: ClassGroup[];
  courses: Course[];
  labs: Lab[];
  mode: "create" | "edit";
  onSubmit: () => void;
  submitLabel: string;
  /** Edit mode: time or lab changed, so students get notified and a reason is required. */
  scheduleChanged?: boolean;
  /** Open or finished meetings: only topic, keterangan and materi can change. */
  contentOnly?: boolean;
}) {
  const [error, setError] = useState("");
  const set = <K extends keyof SessionFormValue>(
    k: K,
    v: SessionFormValue[K],
  ) => onChange({ ...value, [k]: v });
  const today = startOfDay(useNow(60_000));
  const startsAt = fromDateTimeInput(value.date, value.time);
  const endsAt = startsAt + value.durationMin * MINUTE;
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time);

  const submit = () => {
    if (!value.classId) return setError("Pilih kelas.");
    if (value.topic.trim().length < 3) return setError("Isi topik pertemuan.");
    if (!valid) return setError("Pilih tanggal dan jam.");
    if (!value.labId) return setError("Pilih lab.");
    if (
      mode === "edit" &&
      scheduleChanged &&
      value.changeNote.trim().length < 5
    )
      return setError("Tulis alasan perubahan jadwal untuk praktikan.");
    setError("");
    onSubmit();
  };

  return (
    <View className="gap-6">
      {mode === "create" && (
        <Section title="Kelas">
          <View className="flex-row flex-wrap gap-2">
            {classes.map((c) => {
              const course = courses.find((x) => x.id === c.courseId);
              return (
                <Chip
                  key={c.id}
                  label={`${course?.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")} · ${c.label}`}
                  active={value.classId === c.id}
                  onPress={() =>
                    onChange({
                      ...value,
                      classId: c.id,
                      labId: c.labId,
                      time: c.startTime,
                    })
                  }
                />
              );
            })}
          </View>
        </Section>
      )}

      <Section title="Isi pertemuan">
        <View className="gap-2">
          <Label nativeID="topic">Topik</Label>
          <Input
            aria-labelledby="topic"
            placeholder="Contoh: Lokasi, Geofence & Maps"
            value={value.topic}
            onChangeText={(v) => set("topic", v)}
          />
        </View>
        <View className="gap-2">
          <Label nativeID="desc">Keterangan untuk praktikan</Label>
          <RichTextEditor
            value={value.description}
            onChange={(v) => set("description", v)}
            placeholder="Persiapan, alat yang dibawa, tugas pendahuluan… Pakai tombol di atas untuk judul, daftar, atau catatan kecil."
          />
        </View>
      </Section>

      <Section title="Materi">
        <MaterialsEditor
          value={value.materials}
          onChange={(m) => set("materials", m)}
        />
      </Section>

      {!contentOnly && (
        <>
          <Section title="Waktu">
            <View className="flex-row flex-wrap gap-2">
              {[0, 1, 2, 7].map((d) => (
                <Chip
                  key={d}
                  label={
                    d === 0
                      ? "Hari ini"
                      : d === 1
                        ? "Besok"
                        : d === 7
                          ? "+1 minggu"
                          : formatDate(today + d * DAY, {
                              weekday: true,
                              short: true,
                            })
                  }
                  active={value.date === toDateInput(today + d * DAY)}
                  onPress={() => set("date", toDateInput(today + d * DAY))}
                />
              ))}
            </View>
            <View className="flex-row gap-3">
              <DateField
                label="Tanggal"
                value={value.date}
                onChange={(v) => set("date", v)}
              />
              <View className="w-36">
                <TimeField
                  label="Mulai"
                  value={value.time}
                  onChange={(v) => set("time", v)}
                />
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-medium">Durasi</Text>
              <View className="flex-row flex-wrap gap-2">
                {[100, 120, 150, 170].map((m) => (
                  <Chip
                    key={m}
                    label={`${m} mnt`}
                    active={value.durationMin === m}
                    onPress={() => set("durationMin", m)}
                  />
                ))}
              </View>
            </View>
            {valid && (
              <Text className="text-muted-foreground text-[13px]">
                {weekdayName(new Date(startsAt).getDay())},{" "}
                {formatDate(startsAt, { year: true })} · {toTimeInput(startsAt)}
                –{toTimeInput(endsAt)}
              </Text>
            )}
          </Section>

          <Section title="Lab">
            <View className="flex-row flex-wrap gap-2">
              {labs.map((l) => (
                <Chip
                  key={l.id}
                  label={l.name.replace("Lab ", "")}
                  active={value.labId === l.id}
                  onPress={() => set("labId", l.id)}
                />
              ))}
            </View>
          </Section>

          <Section title="Aturan presensi">
            <Text className="text-sm font-medium">
              Dianggap terlambat setelah
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[10, 15, 20, 30].map((m) => (
                <Chip
                  key={m}
                  label={`${m} mnt`}
                  active={value.lateAfterMin === m}
                  onPress={() => set("lateAfterMin", m)}
                />
              ))}
            </View>
          </Section>
        </>
      )}

      {mode === "create" && (
        <Section title="Ulangi">
          <View className="bg-card border-border flex-row items-center gap-3 rounded-2xl border p-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-medium">
                Buat untuk {value.repeatWeeks} minggu
              </Text>
              <Text className="text-muted-foreground text-xs">
                Satu pertemuan per minggu, hari dan jam yang sama
              </Text>
            </View>
            <Stepper
              value={value.repeatWeeks}
              onChange={(v) => set("repeatWeeks", v)}
              min={1}
              max={14}
            />
          </View>
        </Section>
      )}

      {mode === "edit" && scheduleChanged && (
        <Section title="Alasan perubahan jadwal">
          <Textarea
            placeholder="Contoh: lab dipakai ujian, sesi mundur 1 jam."
            value={value.changeNote}
            onChangeText={(v) => set("changeNote", v)}
            className="min-h-20"
          />
          <Text className="text-muted-foreground text-xs">
            Dikirim sebagai push notification ke semua praktikan kelas ini.
          </Text>
        </Section>
      )}

      {!!error && <Text className="text-destructive text-sm">{error}</Text>}
      <Button size="lg" className="h-14 rounded-2xl" onPress={submit}>
        <Text className="text-base font-bold">{submitLabel}</Text>
      </Button>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <View className="bg-muted flex-row items-center rounded-full p-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kurangi"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        className="bg-card size-8 items-center justify-center rounded-full disabled:opacity-40"
      >
        <Icon as={Minus} className="size-4" />
      </Pressable>
      <Text
        className="w-9 text-center font-bold"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tambah"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        className="bg-card size-8 items-center justify-center rounded-full disabled:opacity-40"
      >
        <Icon as={Plus} className="size-4" />
      </Pressable>
    </View>
  );
}
