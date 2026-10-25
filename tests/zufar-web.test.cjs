// Optional browser tools are resolved through NODE_PATH; see docs/zufar-handoff.md.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { before, after, test } = require('node:test');
const { chromium } = require('playwright');
const { buildSync } = require('esbuild');

const root = path.dirname(require.resolve('../package.json'));
const port = 18765;
const baseURL = `http://localhost:${port}`;
let browser;
let server;
let serverOutput = '';

before(async () => {
  server = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'serve', '--port', String(port)], {
    cwd: root, env: { ...process.env, CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (data) => { serverOutput += data; });
  server.stderr.on('data', (data) => { serverOutput += data; });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      if ((await fetch(`${baseURL}/`)).ok) { ready = true; break; }
    } catch { /* Wait for the production server, never a hot-reload server. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, serverOutput);
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
});

after(async () => {
  await browser?.close();
  server?.kill();
});

async function visible(page, text) {
  await page.getByText(text, { exact: true }).filter({ visible: true }).waitFor({ state: 'visible' });
}

async function fits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  const outside = await page.locator('body *').evaluateAll((elements) => elements.filter((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && (box.left < -1 || box.right > window.innerWidth + 1);
  }).map((element) => element.textContent?.slice(0, 80)));
  assert.deepEqual(outside, []);
}

for (const width of [360, 1280]) {
  test(`integrated attendance, history, recap and role guards at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`${baseURL}/`);
      await page.getByRole('radio', { name: 'Asisten', exact: true, checked: true }).waitFor();
      await fits(page);
      await page.getByRole('radio', { name: 'Praktikan', exact: true }).click();
      await page.getByRole('radio', { name: 'Agil Saputra, NIM 123210001', exact: true, checked: true }).waitFor();
      await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
      await visible(page, 'Total kehadiran: 0 sesi');
      await visible(page, 'Belum ada riwayat kehadiran');
      await fits(page);
      await page.getByRole('button', { name: 'Kembali', exact: true }).click();
      await page.getByRole('button', { name: 'Lakukan Presensi', exact: true }).click();
      await visible(page, 'Formulir Presensi Praktikum');
      await visible(page, 'Basis Data Lanjut \u2022 SI-3B');
      assert.equal(await page.getByLabel('NIM Mahasiswa', { exact: true }).inputValue(), '123210001');
      assert.equal(await page.getByLabel('Nama Lengkap Mahasiswa', { exact: true }).inputValue(), 'Agil Saputra');
      await page.getByLabel('Catatan / Nomor PC', { exact: true }).fill('PC-09');
      await fits(page);
      await page.getByRole('button', { name: 'Kirim Presensi', exact: true }).click();
      await visible(page, 'Presensi Berhasil Dicatat!');
      await visible(page, 'Agil Saputra (123210001)');
      await visible(page, 'PC-09');
      const feedbackTime = page.getByText(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d WIB$/, { exact: true }).filter({ visible: true });
      await feedbackTime.waitFor();
      const checkInTime = (await feedbackTime.textContent()).trim().replace(/ WIB$/, '');
      await fits(page);
      await page.getByRole('button', { name: 'Selesai dan Tutup', exact: true }).click();
      const attended = page.getByRole('button', { name: 'Sudah Presensi', exact: true });
      await attended.waitFor();
      assert.equal(await attended.isDisabled(), true);
      await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
      await visible(page, 'Agil Saputra');
      await visible(page, 'NIM 123210001');
      await visible(page, 'Total kehadiran: 1 sesi');
      await visible(page, 'Basis Data Lanjut');
      await visible(page, 'Tanggal sesi: 2026-10-22');
      await visible(page, `Waktu presensi: ${checkInTime}`);
      await visible(page, 'Catatan PC: PC-09');
      await visible(page, 'DIBUKA (AKTIF)');
      assert.equal(await page.getByText('Hadir', { exact: true }).filter({ visible: true }).count(), 1);
      await fits(page);
      if (process.env.LABSYNC_SCREENSHOT_DIR) {
        await page.screenshot({ path: path.join(process.env.LABSYNC_SCREENSHOT_DIR, `history-${width}.png`) });
      }
      await page.getByRole('button', { name: 'Kembali', exact: true }).click();
      await page.getByRole('radio', { name: 'Zufar Ramadhan, NIM 123210002', exact: true }).click();
      await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
      await visible(page, 'Zufar Ramadhan');
      await visible(page, 'NIM 123210002');
      await visible(page, 'Total kehadiran: 0 sesi');
      await visible(page, 'Belum ada riwayat kehadiran');
      assert.equal(await page.getByText('Hadir', { exact: true }).filter({ visible: true }).count(), 0);
      await fits(page);
      await page.getByRole('button', { name: 'Kembali', exact: true }).click();
      await page.getByRole('radio', { name: 'Asisten', exact: true }).click();
      // Revisit the actual client-side history entry after changing roles, without a test-only route.
      await page.goForward();
      await page.waitForURL(`${baseURL}/history`);
      await visible(page, 'Riwayat hanya tersedia untuk praktikan');
      assert.equal(await page.getByText('Hadir', { exact: true }).filter({ visible: true }).count(), 0);
      await page.getByRole('button', { name: 'Kembali', exact: true }).click();
      await page.getByRole('button', { name: 'Lihat rekap Basis Data Lanjut', exact: true }).click();
      await visible(page, 'Rekap Kehadiran');
      await visible(page, 'Agil Saputra');
      await visible(page, 'NIM 123210001');
      await visible(page, `Waktu presensi: ${checkInTime}`);
      await visible(page, 'Catatan PC: PC-09');
      await page.getByLabel('Total Hadir: 1 Praktikan', { exact: true }).waitFor();
      await fits(page);
      if (process.env.LABSYNC_SCREENSHOT_DIR) {
        await page.screenshot({ path: path.join(process.env.LABSYNC_SCREENSHOT_DIR, `rekap-${width}.png`) });
      }
      const back = page.getByRole('button', { name: 'Kembali', exact: true });
      assert.ok((await back.boundingBox()).height >= 44);
      await page.getByRole('button', { name: 'Tutup Sesi', exact: true }).click();
      await page.getByRole('button', { name: 'Batal', exact: true }).click();
      await visible(page, 'DIBUKA (AKTIF)');
      await visible(page, `Waktu presensi: ${checkInTime}`);
      await page.getByLabel('Total Hadir: 1 Praktikan', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Tutup Sesi', exact: true }).click();
      await page.getByRole('button', { name: 'Ya, Tutup Sesi', exact: true }).click();
      await visible(page, 'SELESAI (DITUTUP)');
      await visible(page, 'Agil Saputra');
      await visible(page, 'NIM 123210001');
      await visible(page, `Waktu presensi: ${checkInTime}`);
      await visible(page, 'Catatan PC: PC-09');
      await page.getByLabel('Total Hadir: 1 Praktikan', { exact: true }).waitFor();
      await fits(page);
      await back.click();
      await page.getByRole('radio', { name: 'Praktikan', exact: true }).click();
      await page.goForward();
      await page.waitForURL(`${baseURL}/rekap/ses-002`);
      await visible(page, 'Rekap hanya tersedia untuk asisten sesi ini');
      assert.equal(await page.getByText('Agil Saputra', { exact: true }).filter({ visible: true }).count(), 0);
      await fits(page);
      await back.click();
      await page.getByRole('radio', { name: 'Asisten', exact: true }).click();
      await page.getByRole('button', { name: 'Lihat rekap Pemrograman Mobile', exact: true }).click();
      await visible(page, 'Belum ada praktikan yang melakukan presensi');
      await page.getByLabel('Total Hadir: 0 Praktikan', { exact: true }).waitFor();
      assert.equal(await page.getByText('Agil Saputra', { exact: true }).filter({ visible: true }).count(), 0);
      await fits(page);
      await page.getByRole('button', { name: 'Kembali', exact: true }).click();
      await page.getByRole('radio', { name: 'Praktikan', exact: true }).click();
      await page.getByRole('radio', { name: 'Agil Saputra, NIM 123210001', exact: true }).click();
      await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
      await visible(page, 'Total kehadiran: 1 sesi');
      await visible(page, 'Tanggal sesi: 2026-10-22');
      await visible(page, `Waktu presensi: ${checkInTime}`);
      await visible(page, 'Catatan PC: PC-09');
      await visible(page, 'Hadir');
      await visible(page, 'SELESAI (DITUTUP)');
      await fits(page);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('canceled forms, identity mismatch retry and reload keep attendance consistent', async () => {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await page.goto(`${baseURL}/`);
    await page.getByRole('radio', { name: 'Praktikan', exact: true }).click();
    await page.getByRole('button', { name: 'Lakukan Presensi', exact: true }).click();
    await page.getByLabel('Catatan / Nomor PC', { exact: true }).fill('CANCELED-PC');
    await page.getByRole('button', { name: 'Batal Presensi', exact: true }).click();
    await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
    await visible(page, 'Total kehadiran: 0 sesi');
    await visible(page, 'Belum ada riwayat kehadiran');
    await page.getByRole('button', { name: 'Kembali', exact: true }).click();
    await page.getByRole('button', { name: 'Lakukan Presensi', exact: true }).click();
    assert.equal(await page.getByLabel('Catatan / Nomor PC', { exact: true }).inputValue(), '');
    await page.getByLabel('NIM Mahasiswa', { exact: true }).fill('123210002');
    await page.getByRole('button', { name: 'Kirim Presensi', exact: true }).click();
    await visible(page, 'NIM dan nama harus sesuai dengan identitas praktikan aktif.');
    assert.equal(await page.getByText('Presensi Berhasil Dicatat!', { exact: true }).filter({ visible: true }).count(), 0);
    await page.getByLabel('NIM Mahasiswa', { exact: true }).fill('123210001');
    await page.getByLabel('Nama Lengkap Mahasiswa', { exact: true }).fill('Zufar Ramadhan');
    await page.getByRole('button', { name: 'Kirim Presensi', exact: true }).click();
    await visible(page, 'NIM dan nama harus sesuai dengan identitas praktikan aktif.');
    await fits(page);
    await page.getByLabel('Nama Lengkap Mahasiswa', { exact: true }).fill('Agil Saputra');
    await page.getByLabel('Catatan / Nomor PC', { exact: true }).fill('PC-09');
    await page.getByRole('button', { name: 'Kirim Presensi', exact: true }).click();
    await visible(page, 'Presensi Berhasil Dicatat!');
    await visible(page, 'Agil Saputra (123210001)');
    await page.getByRole('button', { name: 'Selesai dan Tutup', exact: true }).click();
    await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
    await visible(page, 'Total kehadiran: 1 sesi');
    await visible(page, 'Catatan PC: PC-09');
    assert.equal(await page.getByText('Hadir', { exact: true }).filter({ visible: true }).count(), 1);
    assert.equal(await page.getByText('Catatan PC: CANCELED-PC', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Kembali', exact: true }).click();
    await page.getByRole('radio', { name: 'Zufar Ramadhan, NIM 123210002', exact: true }).click();
    await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
    await visible(page, 'Total kehadiran: 0 sesi');
    await visible(page, 'Belum ada riwayat kehadiran');
    await page.getByRole('button', { name: 'Kembali', exact: true }).click();
    await page.waitForURL(`${baseURL}/`);
    await page.getByRole('radio', { name: 'Asisten', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('radio', { name: 'Asisten', exact: true, checked: true }).waitFor();
    await page.getByRole('button', { name: 'Lihat rekap Basis Data Lanjut', exact: true }).click();
    await visible(page, 'Belum ada praktikan yang melakukan presensi');
    await page.getByLabel('Total Hadir: 0 Praktikan', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Kembali', exact: true }).click();
    await page.getByRole('radio', { name: 'Praktikan', exact: true }).click();
    await page.getByRole('radio', { name: 'Agil Saputra, NIM 123210001', exact: true, checked: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Lakukan Presensi', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
    await visible(page, 'Total kehadiran: 0 sesi');
    await visible(page, 'Belum ada riwayat kehadiran');
    await fits(page);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('long feedback stays scrollable and dismissible on a short mobile viewport', async () => {
  const page = await browser.newPage({ viewport: { width: 360, height: 500 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${baseURL}/`);
    await page.getByRole('radio', { name: 'Praktikan', exact: true }).click();
    await page.getByRole('button', { name: 'Lakukan Presensi', exact: true }).click();
    await page.getByLabel('Catatan / Nomor PC', { exact: true }).fill('Catatan praktikum panjang. '.repeat(100));
    await page.getByRole('button', { name: 'Kirim Presensi', exact: true }).click();
    await visible(page, 'Presensi Berhasil Dicatat!');
    const close = page.getByRole('button', { name: 'Selesai dan Tutup', exact: true });
    await close.scrollIntoViewIfNeeded();
    const box = await close.boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 501);
    await close.click();
    assert.equal(await page.getByRole('button', { name: 'Sudah Presensi', exact: true }).isDisabled(), true);
    await fits(page);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('direct links fall back to home without navigation history', async () => {
  for (const route of ['/rekap/ses-002', '/rekap/tidak-ada', '/history']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`${baseURL}${route}`);
      if (route === '/rekap/tidak-ada') await visible(page, 'Sesi tidak ditemukan');
      if (route === '/history') await visible(page, 'Riwayat hanya tersedia untuk praktikan');
      await page.getByRole('button', { name: 'Kembali', exact: true }).click();
      await page.waitForURL(`${baseURL}/`);
      await visible(page, 'LabSync');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
});

// Compile the real pure-props components for browser testing, without adding a test route to the app.
function componentBundle() {
  return buildSync({
    absWorkingDir: root, bundle: true, write: false, platform: 'browser', format: 'iife',
    alias: { 'react-native': 'react-native-web' },
    resolveExtensions: ['.web.tsx', '.tsx', '.ts', '.web.js', '.js', '.json'],
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
    stdin: { resolveDir: root, loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { SafeAreaProvider } from 'react-native-safe-area-context';
      import { SessionRecap } from './src/components/rekap/SessionRecap';
      import { AttendanceHistory } from './src/components/rekap/AttendanceHistory';
      import { EmptyState } from './src/components/common/EmptyState';
      import { INITIAL_SESSIONS, DUMMY_USERS } from './src/constants/dummy-data';
      const FIXTURE_ATTENDANCES = [{ id: 'att-001', sessionId: 'ses-002', studentId: '123210001',
        studentName: 'Agil Saputra', className: 'SI-3B', checkInTime: '10:35:14', notes: 'PC-09' }];
      const root = createRoot(document.getElementById('root'));
      const metrics = { frame: { x: 0, y: 0, width: 360, height: 900 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
      window.renderFixture = (kind, overrides = {}) => {
        const props = { sessions: INITIAL_SESSIONS, attendances: FIXTURE_ATTENDANCES,
          activeUser: DUMMY_USERS[kind === 'recap' ? 0 : 1], sessionId: 'ses-002', onBack() {}, ...overrides };
        root.render(<SafeAreaProvider initialMetrics={metrics}>{kind === 'recap' ? <SessionRecap {...props} />
          : kind === 'history' ? <AttendanceHistory {...props} />
          : <EmptyState title="Tidak ada jadwal" description="Pilih tanggal lain." icon={<span>Ikon kustom</span>} />}</SafeAreaProvider>);
      };
    ` },
  }).outputFiles[0].text;
}

test('pure props: new records, identity filtering, missing data, long text and custom icon', async () => {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.setContent('<html><body style="margin:0"><div id="root" style="height:100vh;display:flex;flex-direction:column"></div></body></html>');
    await page.addScriptTag({ content: componentBundle() });
    const render = (kind, props) => page.evaluate(({ kind, props }) => window.renderFixture(kind, props), { kind, props });
    const longName = 'Muhammad Hafidh Zufar Dewantara dengan nama yang sangat panjang untuk pengujian';
    const record = { id: 'test-1', sessionId: 'ses-002', studentId: '123210002', studentName: longName, className: 'SI-3B', checkInTime: '11:00:01', notes: ' ' };
    await render('recap', { attendances: [record] });
    await visible(page, longName);
    await visible(page, 'Catatan PC: Tidak ada catatan');
    await fits(page);
    await page.getByLabel('Total Hadir: 1 Praktikan', { exact: true }).waitFor();
    await render('recap', { attendances: [record, { ...record, id: 'other-session', sessionId: 'ses-001', studentName: 'Tidak boleh muncul' }] });
    assert.equal(await page.getByText('Tidak boleh muncul', { exact: true }).count(), 0);
    await page.getByLabel('Total Hadir: 1 Praktikan', { exact: true }).waitFor();
    await render('recap', { attendances: [] });
    await visible(page, 'Belum ada praktikan yang melakukan presensi');
    await page.getByLabel('Total Hadir: 0 Praktikan', { exact: true }).waitFor();
    await render('recap', { activeUser: { id: 'other', name: 'Other Assistant', identifier: 'AST-002', role: 'ASISTEN' } });
    await visible(page, 'Rekap hanya tersedia untuk asisten sesi ini');
    assert.equal(await page.getByText('Agil Saputra', { exact: true }).count(), 0);
    await render('history', { activeUser: null });
    await visible(page, 'Belum ada identitas aktif');
    const student = { id: 'not-the-nim', identifier: '123210002', name: longName, role: 'PRAKTISAN' };
    await render('history', { activeUser: student, attendances: [record] });
    await visible(page, 'Total kehadiran: 1 sesi');
    await visible(page, 'Waktu presensi: 11:00:01');
    await fits(page);
    const session = { id: 'ses-002', courseName: 'Sesi lama', className: 'SI-3B', labRoom: 'Lab', date: '2026-10-22', startTime: '08:00', endTime: '10:00', status: 'SELESAI', assistantName: 'Yudha Pratama' };
    await render('history', { activeUser: student,
      attendances: [record, { ...record, id: 'new', sessionId: 'new-session' }],
      sessions: [session, { ...session, id: 'new-session', courseName: 'Sesi terbaru', date: '2026-10-23', status: 'DIBUKA' }],
    });
    await visible(page, 'Total kehadiran: 2 sesi');
    const headings = await page.getByRole('heading').allTextContents();
    assert.ok(headings.indexOf('Sesi terbaru') < headings.indexOf('Sesi lama'));
    await render('history', { activeUser: student, attendances: [record], sessions: [] });
    await visible(page, 'Detail sesi tidak tersedia');
    await visible(page, 'Tanggal sesi: Tidak tersedia');
    await render('history', { activeUser: { ...student, identifier: 'different-nim' }, attendances: [record] });
    await visible(page, 'Belum ada riwayat kehadiran');
    await render('empty', {});
    await visible(page, 'Tidak ada jadwal');
    await visible(page, 'Pilih tanggal lain.');
    await visible(page, 'Ikon kustom');
    await fits(page);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
