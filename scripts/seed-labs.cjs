/* global __dirname */
// Safe Idempotent Lab Seeding Script (D-01)
const fs = require('node:fs');
const path = require('node:path');
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'config', 'sprint3-labs.json');

async function seedLabs(projectId = 'demo-labsync') {
  const emulator = projectId === 'demo-labsync';
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const app = initializeApp({ projectId, ...(emulator ? {} : { credential: applicationDefault() }) });

  try {
    const db = getFirestore(app);
    console.log(`Menyinkronkan master laboratorium ke Firestore (${projectId})...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const lab of manifest) {
      const docRef = db.doc(`labs/${lab.id}`);
      const snap = await docRef.get();

      if (!snap.exists) {
        await docRef.set({
          id: lab.id,
          name: lab.name,
          coordinates: lab.coordinates,
          enabled: lab.enabled,
          configVersion: lab.configVersion,
        });
        created++;
        console.log(`+ Dibuat: ${lab.id} (${lab.name}) - enabled: ${lab.enabled}`);
      } else {
        const current = snap.data();
        if (current.coordinates !== null && lab.coordinates === null) {
          skipped++;
          console.log(`= Dilewati: ${lab.id} (mempertahankan koordinat aktif yang sudah ada)`);
          continue;
        }

        const needsUpdate =
          current.configVersion !== lab.configVersion ||
          current.enabled !== lab.enabled ||
          JSON.stringify(current.coordinates) !== JSON.stringify(lab.coordinates);

        if (needsUpdate) {
          await docRef.update({
            name: lab.name,
            coordinates: lab.coordinates,
            enabled: lab.enabled,
            configVersion: lab.configVersion,
          });
          updated++;
          console.log(`~ Diperbarui: ${lab.id} (${lab.name})`);
        } else {
          skipped++;
          console.log(`= Tidak ada perubahan: ${lab.id}`);
        }
      }
    }

    console.log(`Selesai: ${created} dibuat, ${updated} diperbarui, ${skipped} dilewati.`);
    return { created, updated, skipped };
  } finally {
    await deleteApp(app);
  }
}

if (require.main === module) {
  const projectId = process.argv[2] ?? 'demo-labsync';
  seedLabs(projectId).catch((err) => {
    console.error('Gagal melakukan seeding lab:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { seedLabs };
