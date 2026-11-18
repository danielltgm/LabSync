/** Local manifest validation only. This is not check-in authorization. */
export const REQUIRED_LABS = {
  'lab-ap': 'LAB AP',
  'lab-b': 'LAB B',
  'lab-c': 'LAB C',
  'lab-d': 'LAB D',
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function validateLabManifest(value: unknown): string[] {
  if (!Array.isArray(value)) return ['Manifest lab harus berupa array.'];
  const errors: string[] = [];
  const found = new Set<string>();
  for (const item of value) {
    if (!isObject(item) || typeof item.id !== 'string' || !Object.hasOwn(REQUIRED_LABS, item.id)) {
      errors.push('Manifest memuat ID lab yang tidak dikenal.');
      continue;
    }
    if (found.has(item.id)) errors.push(`ID lab duplikat: ${item.id}.`);
    found.add(item.id);
    if (item.name !== REQUIRED_LABS[item.id as keyof typeof REQUIRED_LABS]) {
      errors.push(`Nama ${item.id} tidak sesuai daftar resmi.`);
    }
    if (typeof item.enabled !== 'boolean') errors.push(`enabled ${item.id} harus boolean.`);
    if (!Number.isSafeInteger(item.configVersion) || (item.configVersion as number) < 1) {
      errors.push(`configVersion ${item.id} harus bilangan bulat positif.`);
    }
    if (item.coordinates === null) {
      if (item.enabled === true) errors.push(`${item.id} aktif tanpa koordinat.`);
    } else if (!isObject(item.coordinates)
      || !finiteInRange(item.coordinates.latitude, -90, 90)
      || !finiteInRange(item.coordinates.longitude, -180, 180)) {
      errors.push(`Koordinat ${item.id} tidak valid.`);
    }
  }
  for (const id of Object.keys(REQUIRED_LABS)) {
    if (!found.has(id)) errors.push(`Lab wajib belum ada: ${id}.`);
  }
  return errors;
}

const POSITIVE_POLICY_FIELDS = ['qrTtlSeconds', 'maxLocationAgeMs', 'maxAccuracyMeters'] as const;

export function validateSprint3Policy(value: unknown): string[] {
  if (!isObject(value)) return ['Policy harus berupa object.'];
  const errors: string[] = [];
  if (typeof value.policyVersion !== 'string' || !value.policyVersion.trim()) errors.push('policyVersion wajib diisi.');
  if (value.timezone !== 'Asia/Jakarta') errors.push('Zona waktu harus Asia/Jakarta.');
  if (!Array.isArray(value.demoPlatforms)
    || value.demoPlatforms.some((item) => item !== 'android' && item !== 'ios')
    || new Set(value.demoPlatforms).size !== value.demoPlatforms.length) {
    errors.push('demoPlatforms harus berisi android/ios tanpa duplikasi.');
  }
  for (const field of POSITIVE_POLICY_FIELDS) {
    if (value[field] !== null && (typeof value[field] !== 'number'
      || !Number.isFinite(value[field]) || value[field] <= 0)) {
      errors.push(`${field} harus null (belum diputuskan) atau angka positif finit.`);
    }
  }
  const skew = value.maxFutureSkewMs;
  if (skew !== null && (typeof skew !== 'number' || !Number.isFinite(skew) || skew < 0)) {
    errors.push('maxFutureSkewMs harus null atau angka nonnegatif finit.');
  }
  return errors;
}

/** Call after structural validation. Empty values remain explicit demo blockers. */
export function sprint3ConfigurationGaps(labs: unknown, policy: unknown): string[] {
  const invalid = [...validateLabManifest(labs), ...validateSprint3Policy(policy)];
  if (invalid.length) return invalid;
  const gaps: string[] = [];
  for (const lab of labs as Record<string, unknown>[]) {
    if (lab.enabled !== true || lab.coordinates === null) gaps.push(`${lab.name}: koordinat resmi belum aktif.`);
  }
  const draft = policy as Record<string, unknown>;
  if (!(draft.demoPlatforms as unknown[]).length) gaps.push('Perangkat/platform demo belum dipilih.');
  for (const field of [...POSITIVE_POLICY_FIELDS, 'maxFutureSkewMs']) {
    if (draft[field] === null) gaps.push(`Kebijakan ${field} belum diputuskan.`);
  }
  return gaps;
}
