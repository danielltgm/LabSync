// Read-only local config check. No login, cloud reads, seed or deployment.
const fs = require('node:fs');
const path = require('node:path');
const { validateLabManifest, validateSprint3Policy, sprint3ConfigurationGaps } = require('../src/utils/sprint3-config.ts');
const root = path.resolve(__dirname, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

try {
  // Match Expo env precedence for development; process environment remains highest.
  for (const file of ['.env.development.local', '.env.local', '.env.development', '.env']) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) process.loadEnvFile(full);
  }
  const labs = readJson('config/sprint3-labs.json');
  const policy = readJson('config/sprint3-policy.json');
  const errors = [...validateLabManifest(labs), ...validateSprint3Policy(policy)];
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log('OK: struktur manifest empat lab dan policy valid.');
    const gaps = sprint3ConfigurationGaps(labs, policy);
    const pkg = readJson('package.json');
    for (const name of ['expo-camera', 'expo-location', 'react-native-maps', 'expo-notifications', 'expo-dev-client']) {
      if (!pkg.dependencies?.[name]) gaps.push(`Dependency ${name} belum terpasang.`);
    }
    const requireEnv = (name) => {
      if (!process.env[name]?.trim()) gaps.push(`Env ${name} belum diisi.`);
    };
    requireEnv('LABSYNC_API_ORIGIN');
    const origin = process.env.LABSYNC_API_ORIGIN;
    if (origin) {
      try {
        const url = new URL(origin);
        if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
          || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
          gaps.push('LABSYNC_API_ORIGIN harus origin HTTPS server bersama tanpa path/credential.');
        }
      } catch { gaps.push('LABSYNC_API_ORIGIN tidak valid.'); }
    }
    for (const platform of policy.demoPlatforms) {
      if (platform === 'android') {
        requireEnv('LABSYNC_ANDROID_PACKAGE');
        requireEnv('GOOGLE_MAPS_ANDROID_API_KEY');
        requireEnv('LABSYNC_ANDROID_GOOGLE_SERVICES_FILE');
        const config = process.env.LABSYNC_ANDROID_GOOGLE_SERVICES_FILE;
        if (config && !fs.existsSync(path.resolve(root, config))) gaps.push('File konfigurasi Firebase Android belum tersedia di mesin ini.');
      } else {
        requireEnv('LABSYNC_IOS_BUNDLE_IDENTIFIER');
        requireEnv('LABSYNC_IOS_GOOGLE_SERVICES_FILE');
        const config = process.env.LABSYNC_IOS_GOOGLE_SERVICES_FILE;
        if (config && !fs.existsSync(path.resolve(root, config))) gaps.push('File konfigurasi Firebase iOS belum tersedia di mesin ini.');
        console.log('VERIFIKASI MANUAL iOS: adapter token FCM dan setup APNs diperlukan pada PR implementasi.');
      }
    }
    if (gaps.length) {
      console.log('BELUM SIAP DEMO:');
      for (const gap of gaps) console.log(`- ${gap}`);
      if (process.argv.includes('--strict')) process.exitCode = 1;
    } else {
      console.log('Konfigurasi lokal terisi; native config, cloud dan pengiriman perangkat tetap perlu diuji.');
    }
    console.log('Pemeriksaan ini tidak membuktikan endpoint, Maps atau FCM sudah bekerja. Lihat docs/sprint-3/testing.md.');
  }
} catch (error) {
  // Do not print env values or credential file contents on failure.
  console.error(`ERROR: pemeriksaan lokal gagal (${error.code || error.name}). Periksa JSON/file konfigurasi.`);
  process.exitCode = 1;
}
