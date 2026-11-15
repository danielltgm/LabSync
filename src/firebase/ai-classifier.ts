import type {
  ClassifyLeaveReason,
  LeaveClassification,
  LeaveClassificationInput,
  LeaveClassificationResult,
} from '@/types/sprint2';

export const LEAVE_CATEGORIES = [
  'Sakit',
  'Keluarga',
  'Akademik',
  'Transportasi / Kendala',
  'Lainnya',
] as const;

export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

const DEFAULT_TIMEOUT_MS = 6000;
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

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

async function classifyWithGemini(reason: string, apiKey: string, timeoutMs: number): Promise<LeaveClassificationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        system_instruction:
          'Klasifikasikan alasan izin praktikum mahasiswa ke tepat satu kategori berikut: Sakit, Keluarga, Akademik, Transportasi / Kendala, atau Lainnya.',
        input: reason,
        response_format: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [...LEAVE_CATEGORIES],
            },
          },
          required: ['category'],
        },
      }),
    });

    if (!response.ok) {
      return classifyByKeywords(reason);
    }

    const payload = (await response.json()) as {
      outputs?: { type?: string; text?: string }[];
    };
    const textOutput = payload.outputs?.find((item) => item.type === 'text')?.text;
    if (!textOutput) {
      return classifyByKeywords(reason);
    }

    const parsed = JSON.parse(textOutput) as Partial<LeaveClassificationResult>;
    if (typeof parsed.category === 'string' && parsed.category.trim()) {
      return { category: parsed.category.trim() };
    }

    return classifyByKeywords(reason);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI classification timeout');
    }
    return classifyByKeywords(reason);
  } finally {
    clearTimeout(timer);
  }
}

export const classifyLeaveReason: ClassifyLeaveReason = async ({
  reason,
}: LeaveClassificationInput): Promise<LeaveClassificationResult> => {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error('Alasan izin wajib diisi');
  }

  if (/\[(timeout|unavailable)\]/i.test(cleanReason)) {
    throw new Error('AI classification unavailable');
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  if (apiKey) {
    return classifyWithGemini(cleanReason, apiKey, DEFAULT_TIMEOUT_MS);
  }

  return classifyByKeywords(cleanReason);
};

export async function resolveLeaveClassification(
  reason: string,
  classifier: ClassifyLeaveReason = classifyLeaveReason,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<LeaveClassification> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      classifier({ reason }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI classification timeout')), timeoutMs);
      }),
    ]);

    const category = result?.category?.trim();
    if (!category) {
      return { status: 'unavailable' };
    }

    return { status: 'classified', category };
  } catch {
    return { status: 'unavailable' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
