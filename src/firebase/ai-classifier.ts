import type { LeaveClassificationResult } from '@/types/sprint2';

export const LEAVE_CATEGORIES = [
  'Sakit',
  'Keluarga',
  'Akademik',
  'Transportasi / Kendala',
  'Lainnya',
] as const;

export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];


const KEYWORD_RULES: { category: LeaveCategory; pattern: RegExp }[] = [
  {
    category: 'Sakit',
    pattern: /\b(sakit|demam|dokter|klinik|puskesmas|rumah sakit|rs\b|rawat|opname|flu|batuk|pusing|mual|tipes|medis|kesehatan|igd)\b/i,
  },
  {
    category: 'Keluarga',
    pattern: /\b(keluarga|orang tua|ortu|ayah|ibu|nenek|kakek|saudara|duka|meninggal|menikah|pernikahan|acara keluarga|mudik)\b/i,
  },
  {
    category: 'Akademik',
    pattern: /\b(lomba|delegasi|kompetisi|ujian|uts|uas|bimbingan|dosen|seminar|konferensi|kampus|organisasi|kepanitiaan|kuliah|akademik)\b/i,
  },
  {
    category: 'Transportasi / Kendala',
    pattern: /\b(ban bocor|mogok|macet|hujan|banjir|motor|mobil|kendaraan|kereta|transportasi|mati lampu|listrik|kendala)\b/i,
  },
];

export function classifyByKeywords(reason: string): LeaveClassificationResult {
  const normalized = reason.trim();
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(normalized)) {
      return { category: rule.category };
    }
  }
  return { category: 'Lainnya' };
}
