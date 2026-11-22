import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import type { Coordinates, LabConfiguration, LabId } from '@/types/sprint3';
import { REQUIRED_LABS, validateLabManifest } from '@/utils/sprint3-config';

export const OFFICIAL_LAB_IDS: readonly LabId[] = ['lab-ap', 'lab-b', 'lab-c', 'lab-d'] as const;

export const OFFICIAL_LAB_NAMES: Record<LabId, string> = REQUIRED_LABS;

export function isValidLabId(value: unknown): value is LabId {
  return typeof value === 'string' && OFFICIAL_LAB_IDS.includes(value as LabId);
}

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { latitude, longitude } = value as Record<string, unknown>;
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function validateLabConfiguration(config: unknown): { valid: boolean; error?: string } {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { valid: false, error: 'Konfigurasi lab harus berupa objek.' };
  }
  const item = config as Record<string, unknown>;
  if (!isValidLabId(item.id)) {
    return { valid: false, error: `ID lab tidak dikenal: ${String(item.id)}.` };
  }
  if (item.name !== OFFICIAL_LAB_NAMES[item.id]) {
    return { valid: false, error: `Nama lab ${item.id} harus tepat "${OFFICIAL_LAB_NAMES[item.id]}".` };
  }
  if (typeof item.enabled !== 'boolean') {
    return { valid: false, error: `Status enabled lab ${item.id} harus boolean.` };
  }
  if (typeof item.configVersion !== 'number' || !Number.isSafeInteger(item.configVersion) || item.configVersion < 1) {
    return { valid: false, error: `configVersion lab ${item.id} harus bilangan bulat positif.` };
  }
  if (item.coordinates === null) {
    if (item.enabled === true) {
      return { valid: false, error: `Lab ${item.id} tidak boleh aktif jika koordinat bernilai null.` };
    }
  } else if (!isValidCoordinates(item.coordinates)) {
    return { valid: false, error: `Koordinat lab ${item.id} di luar rentang geografis yang valid.` };
  }
  return { valid: true };
}

export async function getLabConfiguration(
  db: Firestore,
  labId: LabId
): Promise<LabConfiguration | null> {
  const labRef = doc(db, 'labs', labId);
  const snap = await getDoc(labRef);
  if (!snap.exists()) return null;
  return snap.data() as LabConfiguration;
}

export async function listLabConfigurations(
  db: Firestore
): Promise<LabConfiguration[]> {
  const labsCollection = collection(db, 'labs');
  const snap = await getDocs(labsCollection);
  return snap.docs
    .map((docSnap) => docSnap.data() as LabConfiguration)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getActiveLab(
  db: Firestore,
  labId: LabId
): Promise<LabConfiguration> {
  const lab = await getLabConfiguration(db, labId);
  if (!lab) {
    throw new Error(`Laboratorium "${labId}" tidak ditemukan.`);
  }
  if (!lab.enabled || !lab.coordinates) {
    throw new Error(
      `Laboratorium "${lab.name}" (${labId}) belum aktif atau belum memiliki koordinat resmi.`
    );
  }
  return lab;
}

export interface SyncManifestResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function syncLabManifest(
  db: Firestore,
  manifest: LabConfiguration[]
): Promise<SyncManifestResult> {
  const manifestErrors = validateLabManifest(manifest);
  if (manifestErrors.length > 0) {
    return { created: 0, updated: 0, skipped: 0, errors: manifestErrors };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const lab of manifest) {
    const labRef = doc(db, 'labs', lab.id);
    const existingSnap = await getDoc(labRef);

    if (!existingSnap.exists()) {
      await setDoc(labRef, {
        id: lab.id,
        name: lab.name,
        coordinates: lab.coordinates,
        enabled: lab.enabled,
        configVersion: lab.configVersion,
      });
      created++;
    } else {
      const current = existingSnap.data() as LabConfiguration;
      // Jangan menimpa koordinat valid yang sudah ada dengan null
      if (current.coordinates !== null && lab.coordinates === null) {
        skipped++;
        continue;
      }

      // Update jika ada perubahan versi atau status
      const needsUpdate =
        current.configVersion !== lab.configVersion ||
        current.enabled !== lab.enabled ||
        JSON.stringify(current.coordinates) !== JSON.stringify(lab.coordinates);

      if (needsUpdate) {
        await updateDoc(labRef, {
          name: lab.name,
          coordinates: lab.coordinates,
          enabled: lab.enabled,
          configVersion: lab.configVersion,
        });
        updated++;
      } else {
        skipped++;
      }
    }
  }

  return { created, updated, skipped, errors: [] };
}
