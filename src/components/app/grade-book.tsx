import { FileSpreadsheet, PencilLine, Plus, Save, Trash, Undo2 } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { useConfirm, type Change } from '@/components/app/confirm';
import { Avatar, Chip, EmptyState, SearchField, Surface } from '@/components/app/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { finalGrade, gradeBook, gradeKey, letterGrade } from '@/data/selectors';
import { useStore } from '@/data/store';
import type { Assignment } from '@/data/types';
import { exportClassGrades, exportErrorMessage } from '@/lib/export';
import { cn } from '@/lib/utils';

const NAME_W = 176;
const COL_W = 92;
const FINAL_W = 84;
const ROW_H = 52;

type Draft = Record<string, string>;

const parse = (raw: string): number | null | 'invalid' => {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : 'invalid';
};

export function gradeTone(score?: number) {
  if (score === undefined) return 'text-muted-foreground';
  if (score >= 75) return 'text-success-ink';
  if (score >= 60) return 'text-warning-ink';
  return 'text-danger-ink';
}

/**
 * Assistant grade book: one row per student, one column per graded item, weighted final on the right.
 * Typing only changes a local draft; "Simpan" shows every changed score for confirmation before writing.
 */
export function GradeBook({ classId }: { classId: string }) {
  const { state, setGrades, addAssignment, updateAssignment, deleteAssignment, toast } = useStore();
  const book = useMemo(() => gradeBook(state, classId), [state, classId]);
  const { assignments, rows, weightTotal } = book;
  const [draft, setDraft] = useState<Draft>({});
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Assignment | 'new' | null>(null);
  const { confirm, dialog } = useConfirm();
  const cells = useRef(new Map<string, React.ComponentRef<typeof TextInput>>());

  const shown = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    return !q || r.user.name.toLowerCase().includes(q) || r.user.nim.includes(q);
  });

  const value = (aid: string, nim: string) => {
    const k = gradeKey(aid, nim);
    if (k in draft) return draft[k];
    const v = state.grades[k];
    return v === undefined ? '' : String(v);
  };

  // Live preview: finals and "graded" flags include the draft.
  const preview = useMemo(() => {
    const scoreOf = (aid: string, nim: string) => {
      const k = gradeKey(aid, nim);
      if (k in draft) {
        const p = parse(draft[k]);
        return typeof p === 'number' ? p : undefined;
      }
      return state.grades[k];
    };
    const graded = assignments.map((a) => rows.some((r) => scoreOf(a.id, r.user.nim) !== undefined));
    const finals = new Map(rows.map((r) => [r.user.nim, finalGrade(assignments, assignments.map((a) => scoreOf(a.id, r.user.nim)), graded)]));
    const averages = assignments.map((a) => {
      const xs = rows.map((r) => scoreOf(a.id, r.user.nim)).filter((x): x is number => x !== undefined);
      return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : undefined;
    });
    return { finals, averages };
  }, [draft, state.grades, assignments, rows]);

  const changes = Object.entries(draft).filter(([k, raw]) => {
    const before = state.grades[k];
    const after = parse(raw);
    return after !== 'invalid' && (after ?? undefined) !== before;
  });
  const invalid = Object.values(draft).some((raw) => parse(raw) === 'invalid');

  const focusCell = (col: number, row: number) => {
    const a = assignments[col];
    const r = shown[row];
    if (a && r) cells.current.get(`${a.id}:${r.user.nim}`)?.focus();
  };

  const save = () => {
    const list: Change[] = changes.map(([k, raw]) => {
      const [aid, nim] = k.split('__');
      const a = assignments.find((x) => x.id === aid);
      const u = rows.find((r) => r.user.nim === nim)?.user;
      const before = state.grades[k];
      const after = parse(raw);
      return { label: `${u?.name ?? nim} · ${a?.title ?? ''}`, from: before === undefined ? 'kosong' : String(before), to: after === null ? 'dikosongkan' : String(after) };
    });
    // Changing a score that was already saved needs a reason; it goes into the audit log.
    const revises = changes.some(([k]) => state.grades[k] !== undefined);
    confirm({
      title: `Simpan ${changes.length} nilai?`,
      body: revises ? 'Ada nilai lama yang diubah. Perubahan tercatat di log kelas beserta alasannya.' : 'Praktikan bisa melihat nilainya sendiri di halaman kelas.',
      confirmLabel: 'Simpan nilai',
      changes: list,
      reason: revises ? { required: true, label: 'Alasan perubahan', placeholder: 'Contoh: revisi laporan diterima' } : undefined,
      onConfirm: (reason) => {
        const out: { assignmentId: string; nim: string; score: number | null }[] = [];
        for (const [k, raw] of changes) {
          const [aid, nim] = k.split('__');
          const p = parse(raw);
          if (p !== 'invalid') out.push({ assignmentId: aid, nim, score: p });
        }
        setGrades(out, reason);
        setDraft({});
        toast({ title: `${changes.length} nilai disimpan`, tone: 'success' });
      },
    });
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <SearchField className="min-w-48 flex-1" placeholder="Cari praktikan" value={query} onChangeText={setQuery} />
        <Button className="h-12 rounded-full px-5" onPress={() => setEditing('new')}>
          <Icon as={Plus} className="text-primary-foreground size-4" />
          <Text>Tugas</Text>
        </Button>
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <View className={cn('rounded-full px-3 py-1.5', weightTotal === 100 ? 'bg-success-soft' : 'bg-warning-soft')}>
          <Text className={cn('font-mono text-[11px] font-bold uppercase', weightTotal === 100 ? 'text-success-ink' : 'text-warning-ink')}>
            Bobot total {weightTotal}%
          </Text>
        </View>
        <Text className="text-muted-foreground text-xs">Ketuk judul kolom untuk ubah bobot. Enter pindah ke baris bawah.</Text>
      </View>

      {assignments.length === 0 ? (
        <Surface>
          <EmptyState icon={PencilLine} title="Belum ada penilaian" body="Tambah tugas, laporan, atau responsi, lalu isi nilainya per praktikan." />
        </Surface>
      ) : (
        <Surface className="overflow-hidden p-0">
          <View className="flex-row">
            {/* Names stay put while the score columns scroll sideways. */}
            <View style={{ width: NAME_W }} className="border-border border-r">
              <View style={{ height: 64 }} className="border-border justify-end border-b px-3 pb-2">
                <Text className="text-muted-foreground font-mono text-[11px] font-bold uppercase">{shown.length} praktikan</Text>
              </View>
              {shown.map((r) => (
                <View key={r.user.nim} style={{ height: ROW_H }} className="border-border flex-row items-center gap-2 border-b px-3">
                  <Avatar name={r.user.name} size="sm" className="size-7" />
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-semibold" numberOfLines={1}>
                      {r.user.name}
                    </Text>
                    <Text className="text-muted-foreground font-mono text-[10px]">{r.user.nim.slice(-6)}</Text>
                  </View>
                </View>
              ))}
              <View style={{ height: 40 }} className="justify-center px-3">
                <Text className="text-muted-foreground text-xs font-semibold">Rata-rata kelas</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
              <View>
                <View style={{ height: 64 }} className="border-border flex-row border-b">
                  {assignments.map((a) => (
                    <Pressable
                      key={a.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Ubah ${a.title}`}
                      onPress={() => setEditing(a)}
                      style={{ width: COL_W }}
                      className="active:bg-accent justify-end gap-0.5 px-2 pb-2"
                    >
                      <Text className="text-[12px] font-bold leading-4" numberOfLines={2}>
                        {a.title}
                      </Text>
                      <Text className="text-violet font-mono text-[11px] font-bold">{a.weight}%</Text>
                    </Pressable>
                  ))}
                  <View style={{ width: FINAL_W }} className="bg-muted justify-end px-2 pb-2">
                    <Text className="text-[12px] font-bold">Akhir</Text>
                    <Text className="text-muted-foreground font-mono text-[11px]">0–100</Text>
                  </View>
                </View>
                {shown.map((r, rowIndex) => {
                  const fin = preview.finals.get(r.user.nim);
                  return (
                    <View key={r.user.nim} style={{ height: ROW_H }} className="border-border flex-row border-b">
                      {assignments.map((a, colIndex) => {
                        const k = gradeKey(a.id, r.user.nim);
                        const v = value(a.id, r.user.nim);
                        const dirty = k in draft && parse(draft[k]) !== (state.grades[k] ?? null);
                        const bad = k in draft && parse(draft[k]) === 'invalid';
                        return (
                          <View key={a.id} style={{ width: COL_W }} className="items-center justify-center px-1.5">
                            <TextInput
                              ref={(el) => {
                                if (el) cells.current.set(`${a.id}:${r.user.nim}`, el);
                                else cells.current.delete(`${a.id}:${r.user.nim}`);
                              }}
                              accessibilityLabel={`${a.title}, ${r.user.name}`}
                              value={v}
                              onChangeText={(t) => setDraft((d) => ({ ...d, [k]: t.replace(/[^\d.,]/g, '') }))}
                              keyboardType="number-pad"
                              maxLength={3}
                              selectTextOnFocus
                              returnKeyType="next"
                              submitBehavior="submit"
                              onSubmitEditing={() => focusCell(colIndex, rowIndex + 1)}
                              placeholder="–"
                              placeholderTextColorClassName="accent-muted-foreground"
                              className={cn(
                                'text-foreground h-10 w-full rounded-xl text-center font-mono text-[15px] font-bold',
                                bad ? 'bg-danger-soft text-danger-ink' : dirty ? 'bg-mustard/40' : 'bg-muted',
                              )}
                            />
                          </View>
                        );
                      })}
                      <View style={{ width: FINAL_W }} className="bg-muted flex-row items-center justify-center gap-1">
                        <Text className={cn('font-display text-xl font-extrabold', gradeTone(fin))}>{fin ?? '–'}</Text>
                        {fin !== undefined && <Text className="text-muted-foreground font-mono text-[11px] font-bold">{letterGrade(fin)}</Text>}
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 40 }} className="flex-row">
                  {preview.averages.map((avg, i) => (
                    <View key={assignments[i].id} style={{ width: COL_W }} className="items-center justify-center">
                      <Text className={cn('font-mono text-[13px] font-bold', gradeTone(avg))}>{avg ?? '–'}</Text>
                    </View>
                  ))}
                  <View style={{ width: FINAL_W }} className="bg-muted" />
                </View>
              </View>
            </ScrollView>
          </View>
        </Surface>
      )}

      {assignments.length > 0 && rows.length > 0 && changes.length === 0 && !invalid && (
        <Button
          className="h-12 rounded-2xl"
          onPress={() =>
            exportClassGrades(state, classId)
              .then(() => toast({ title: 'Nilai Excel siap', body: '2 sheet: Nilai, Komponen.', tone: 'success' }))
              .catch((e) => toast({ title: exportErrorMessage(e), tone: 'danger' }))
          }
        >
          <Icon as={FileSpreadsheet} className="text-primary-foreground size-4" />
          <Text>Export nilai kelas (.xlsx)</Text>
        </Button>
      )}

      {(changes.length > 0 || invalid) && (
        <View className="bg-ink flex-row items-center gap-2 rounded-full p-1.5 pl-5">
          <Text className="text-ink-foreground min-w-0 flex-1 text-sm font-semibold" numberOfLines={1}>
            {invalid ? 'Nilai harus 0–100' : `${changes.length} perubahan belum disimpan`}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setDraft({})} className="h-10 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-80">
            <Icon as={Undo2} className="text-ink-muted size-4" />
            <Text className="text-ink-muted text-sm font-semibold">Batal</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={invalid || !changes.length}
            onPress={save}
            className="bg-aqua h-10 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-90 disabled:opacity-40"
          >
            <Icon as={Save} className="text-on-bright size-4" />
            <Text className="text-on-bright text-sm font-bold">Simpan</Text>
          </Pressable>
        </View>
      )}

      <AssignmentDialog
        target={editing}
        otherWeight={weightTotal - (editing && editing !== 'new' ? editing.weight : 0)}
        onClose={() => setEditing(null)}
        onSave={(title, weight) => {
          if (editing === 'new') {
            addAssignment({ classId, title, weight });
            toast({ title: 'Kolom nilai ditambahkan', body: title, tone: 'success' });
          } else if (editing && (title !== editing.title || weight !== editing.weight)) {
            const before = editing;
            confirm({
              title: 'Ubah kolom nilai?',
              body: 'Nilai akhir semua praktikan dihitung ulang.',
              confirmLabel: 'Simpan',
              changes: [
                ...(title !== before.title ? [{ label: 'Judul', from: before.title, to: title }] : []),
                ...(weight !== before.weight ? [{ label: 'Bobot', from: `${before.weight}%`, to: `${weight}%` }] : []),
              ],
              onConfirm: () => updateAssignment(before.id, { title, weight }),
            });
          }
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing || editing === 'new') return;
          const target = editing;
          setEditing(null);
          const scored = rows.filter((r) => state.grades[gradeKey(target.id, r.user.nim)] !== undefined).length;
          confirm({
            title: `Hapus ${target.title}?`,
            body: scored ? `${scored} nilai yang sudah diisi ikut terhapus dan tidak bisa dikembalikan.` : 'Kolom ini belum punya nilai.',
            confirmLabel: 'Hapus',
            destructive: true,
            onConfirm: () => deleteAssignment(target.id),
          });
        }}
      />
      {dialog}
    </View>
  );
}

function AssignmentDialog({
  target,
  otherWeight,
  onClose,
  onSave,
  onDelete,
}: {
  target: Assignment | 'new' | null;
  otherWeight: number;
  onClose: () => void;
  onSave: (title: string, weight: number) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState('');
  const [prev, setPrev] = useState<typeof target>(null);
  if (target !== prev) {
    setPrev(target);
    setTitle(target && target !== 'new' ? target.title : '');
    setWeight(target && target !== 'new' ? String(target.weight) : String(Math.max(0, 100 - otherWeight) || 10));
  }
  const w = Number(weight);
  const valid = title.trim().length >= 2 && Number.isFinite(w) && w > 0 && w <= 100;
  const isNew = target === 'new';
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Kolom nilai baru' : 'Ubah kolom nilai'}</DialogTitle>
          <DialogDescription>Bobot dipakai untuk nilai akhir. Kolom lain sekarang {otherWeight}%.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Mis. Tugas pendahuluan 2, UAS praktikum" value={title} onChangeText={setTitle} />
        <View className="flex-row flex-wrap gap-2">
          {[10, 15, 20, 25, 30, 40].map((n) => (
            <Chip key={n} label={`${n}%`} active={w === n} onPress={() => setWeight(String(n))} />
          ))}
        </View>
        <View className="flex-row items-center gap-2">
          <Input className="w-24" keyboardType="number-pad" maxLength={3} value={weight} onChangeText={(t) => setWeight(t.replace(/\D/g, ''))} />
          <Text className="text-muted-foreground text-sm">% · total jadi {otherWeight + (Number.isFinite(w) ? w : 0)}%</Text>
        </View>
        <DialogFooter>
          {!isNew && (
            <Button variant="outline" className="h-11 rounded-xl" onPress={onDelete}>
              <Icon as={Trash} className="text-destructive size-4" />
              <Text className="text-destructive">Hapus kolom</Text>
            </Button>
          )}
          <Button className="h-11 rounded-xl" disabled={!valid} onPress={() => onSave(title.trim(), w)}>
            <Text>{isNew ? 'Tambah kolom' : 'Lanjut'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
