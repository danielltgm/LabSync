const assert = require('node:assert/strict');
const { mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { chromium } = require('playwright');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { seedDemo } = require('../scripts/seed-firebase.cjs');

const url = process.env.LABSYNC_WEB_URL ?? 'http://localhost:8081';

async function signIn(page, email) {
  await page.goto(url);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata sandi').fill('labsync-local');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByRole('heading', { name: 'Jadwal praktikum' }).waitFor();
}

async function screenshot(page, name) {
  if (!process.env.LABSYNC_SCREENSHOT_DIR) return;
  await page.getByRole('button', { name: 'Batal', exact: true }).waitFor({ state: 'hidden' });
  mkdirSync(process.env.LABSYNC_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.LABSYNC_SCREENSHOT_DIR, name), fullPage: true });
}

async function withDeniedRead(collection, check) {
  const rules = readFileSync('firestore.rules', 'utf8');
  const pattern = new RegExp(`(match /${collection}/\\{[^}]+\\} \\{[\\s\\S]*?)(?:allow get: if resource == null && canReadMissingOwnRecord\\([^)]*\\);\\s*)?allow read: if canReadStudentRecord\\(resource.data\\);`);
  const denied = collection === 'reviewWrite'
    ? rules.replace('allow update: if managesClass(resource.data.classId) && isValidLeaveReview(requestId);', 'allow update: if false;')
    : rules.replace(pattern, '$1allow read: if false;');
  assert.notEqual(denied, rules);
  const install = (text) => initializeTestEnvironment({ projectId: 'demo-labsync', firestore: { rules: text } });
  const blocked = await install(denied);
  let restored;
  try {
    await check(async () => { restored = await install(rules); });
  } finally {
    if (!restored) restored = await install(rules);
    await blocked.cleanup();
    await restored.cleanup();
  }
}

test('SRS-05/06: live recap, personal history, assistant decisions, persistence and guards', { timeout: 180000 }, async (t) => {
  // Never seed, reset or create fixture users against the shared cloud project.
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  await seedDemo('demo-labsync');
  const adminApp = initializeApp({ projectId: 'demo-labsync' }, 'srs05-06-tests');
  const db = getFirestore(adminApp);
  const auth = getAuth(adminApp);
  const assistantUid = (await auth.getUserByEmail('assistant@labsync.example')).uid;
  const studentUid = (await auth.getUserByEmail('student@labsync.example')).uid;
  let other;
  try { other = await auth.getUserByEmail('other@labsync.example'); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    other = await auth.createUser({ email: 'other@labsync.example', password: 'labsync-local' });
  }
  const otherUid = other.uid;
  const ownAttendance = db.doc(`attendance/demo-mobile__${studentUid}`);
  const oldAttendance = db.doc(`attendance/demo-old__${studentUid}`);
  const ownLeave = db.doc(`leaveRequests/demo-mobile__${studentUid}`);
  const otherLeave = db.doc(`leaveRequests/demo-mobile__${otherUid}`);
  const secondLeave = db.doc(`leaveRequests/demo-second__${studentUid}`);
  const originalSession = (await db.doc('sessions/demo-mobile').get()).data();
  await Promise.all([
    ownAttendance.delete(), oldAttendance.delete(), ownLeave.delete(), otherLeave.delete(), secondLeave.delete(),
    db.doc('sessions/demo-mobile').update({ status: 'TERJADWAL' }),
    db.doc('sessions/demo-second').set({ ...originalSession, courseName: 'Basis Data', status: 'DIBUKA', date: '2026-11-21' }),
    db.doc(`users/${otherUid}`).set({ name: 'Praktikan Lain', identifier: 'NIM-LAIN', role: 'PRAKTISAN' }),
    db.doc(`enrollments/${otherUid}/classes/demo-if3a`).set({ enrolledAt: Timestamp.now() }),
  ]);

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const assistant = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const student = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const errors = [];
  for (const page of [assistant, student]) page.on('pageerror', (error) => errors.push(error.message));
  try {
    await Promise.all([signIn(assistant, 'assistant@labsync.example'), signIn(student, 'student@labsync.example')]);

    await t.test('empty states become live attendance without refresh; history is UID-based and ordered', async () => {
      await assistant.goto(`${url}/rekap/demo-mobile`);
      await assistant.getByRole('heading', { name: 'Belum ada praktikan yang melakukan presensi' }).waitFor();
      await student.getByRole('button', { name: 'Riwayat Saya', exact: true }).click();
      await student.getByRole('heading', { name: 'Belum ada riwayat kehadiran' }).waitFor();
      const record = {
        sessionId: 'demo-mobile', classId: 'demo-if3a', studentUid, studentId: 'NIM-SEBELUM-BERUBAH',
        studentName: 'Muhammad Hafidh Zufar Dewantara', className: 'IF-3A Demo',
        checkedInAt: Timestamp.fromDate(new Date('2026-11-15T01:02:03Z')), notes: 'PC-09',
      };
      await ownAttendance.set(record);
      await assistant.getByText('Muhammad Hafidh Zufar Dewantara', { exact: true }).waitFor();
      await assistant.getByText('08:02:03', { exact: false }).waitFor();
      await student.getByText('Total kehadiran: 1 sesi', { exact: true }).waitFor();
      await oldAttendance.set({ ...record, sessionId: 'demo-old', checkedInAt: Timestamp.fromDate(new Date('2026-11-14T01:02:03Z')) });
      await student.getByText('Total kehadiran: 2 sesi', { exact: true }).waitFor();
      const headings = await student.getByRole('heading').allTextContents();
      assert.ok(headings.indexOf('Pemrograman Mobile') < headings.indexOf('Detail sesi tidak tersedia'));
      await screenshot(student, 'riwayat-mobile.png');
    });

    await t.test('attendance read errors show a retry action and recover without logout', async () => {
      await withDeniedRead('attendance', async (restore) => {
        await student.goto(`${url}/history`);
        await student.getByRole('alert').filter({ hasText: 'Data presensi gagal dimuat.' }).waitFor();
        assert.equal(await student.getByRole('heading', { name: 'Belum ada riwayat kehadiran', exact: true }).count(), 0);
        await restore();
        await student.getByRole('button', { name: 'Coba lagi', exact: true }).click();
        await student.getByText('Total kehadiran: 2 sesi', { exact: true }).waitFor();
      });
    });

    const longName = 'Muhammad Hafidh Zufar Dewantara';
    const leaveBase = {
      sessionId: 'demo-mobile', classId: 'demo-if3a', studentUid, studentName: longName,
      studentId: 'NIM-DEMO', reason: 'Saya sedang sakit dan perlu istirahat sesuai anjuran dokter. '.repeat(12).trim(),
      submittedAt: Timestamp.now(), classification: { status: 'unavailable' }, decision: 'pending',
    };
    await Promise.all([
      ownLeave.set(leaveBase),
      otherLeave.set({ ...leaveBase, studentUid: otherUid, studentName: 'Praktikan Lain', studentId: 'NIM-LAIN',
        reason: 'Alasan privat praktikan lain.', classification: { status: 'classified', category: 'Keperluan keluarga' } }),
      secondLeave.set({ ...leaveBase, sessionId: 'demo-second', reason: 'Pengajuan untuk sesi lain.', classification: { status: 'pending' } }),
    ]);

    await t.test('session queue isolates requests, shows AI failure, and cancellation preserves pending state', async () => {
      await assistant.getByRole('button', { name: 'Review izin sesi ini' }).click();
      await assistant.getByText('2 menunggu review · 2 pengajuan', { exact: true }).waitFor();
      await assistant.getByText('Klasifikasi AI belum tersedia', { exact: true }).waitFor();
      assert.equal(await assistant.getByText('Pengajuan untuk sesi lain.', { exact: true }).count(), 0);
      await assistant.setViewportSize({ width: 360, height: 500 });
      await assistant.getByRole('button', { name: `Terima izin ${longName}`, exact: true }).click();
      const confirmBounds = await assistant.getByRole('button', { name: 'Ya, terima izin', exact: true }).boundingBox();
      assert.ok(confirmBounds.height >= 44 && confirmBounds.width >= 44);
      await assistant.getByRole('button', { name: 'Batal', exact: true }).click();
      await assistant.getByRole('button', { name: 'Batal', exact: true }).waitFor({ state: 'hidden' });
      assert.equal((await ownLeave.get()).data().decision, 'pending');
      assert.equal(await assistant.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await assistant.getByRole('heading', { name: 'Review Izin', exact: true }).scrollIntoViewIfNeeded();
      await screenshot(assistant, 'review-izin-mobile.png');
      await assistant.setViewportSize({ width: 1280, height: 900 });
    });

    await t.test('leave read errors recover through retry', async () => {
      await withDeniedRead('leaveRequests', async (restore) => {
        await student.goto(`${url}/izin`);
        await student.getByRole('alert').filter({ hasText: 'Data izin gagal dimuat.' }).waitFor();
        await restore();
        await student.getByRole('button', { name: 'Coba lagi', exact: true }).click();
        await student.getByText('2 menunggu review · 2 pengajuan', { exact: true }).waitFor();
      });
      // The assistant listener also terminated under the deliberately denied rules.
      await assistant.reload();
      await assistant.getByText('2 menunggu review · 2 pengajuan', { exact: true }).waitFor();
    });

    await t.test('a denied decision shows an error and leaves the request pending for retry', async () => {
      await withDeniedRead('reviewWrite', async (restore) => {
        await assistant.getByRole('button', { name: `Terima izin ${longName}`, exact: true }).click();
        await assistant.getByRole('button', { name: 'Ya, terima izin', exact: true }).click();
        await assistant.getByRole('alert').filter({ hasText: 'tidak memiliki akses' }).waitFor();
        assert.equal((await ownLeave.get()).data().decision, 'pending');
        assert.equal(await assistant.getByText('Izin berhasil diterima.', { exact: true }).count(), 0);
        await restore();
      });
    });

    await t.test('approval appears live in own status and persists after reload; rejection is final', async () => {
      await student.goto(`${url}/izin`);
      await student.getByRole('heading', { name: 'Status Izin Saya', exact: true }).waitFor();
      await student.getByText('2 menunggu review · 2 pengajuan', { exact: true }).waitFor();
      assert.equal(await student.getByText('Alasan privat praktikan lain.', { exact: true }).count(), 0);
      await assistant.getByRole('button', { name: `Terima izin ${longName}`, exact: true }).click();
      await assistant.getByRole('button', { name: 'Ya, terima izin', exact: true }).click();
      await assistant.getByText('Izin berhasil diterima.', { exact: true }).waitFor();
      await student.getByText('Izin diterima', { exact: true }).waitFor();
      const accepted = (await ownLeave.get()).data();
      assert.equal(accepted.reviewedBy, assistantUid);
      assert.ok(accepted.reviewedAt instanceof Timestamp);
      assert.deepEqual(accepted.classification, { status: 'unavailable' });
      await student.reload();
      await student.getByText('Izin diterima', { exact: true }).waitFor();
      await screenshot(student, 'status-izin-mobile.png');
      await assistant.getByRole('button', { name: 'Tolak izin Praktikan Lain', exact: true }).click();
      await assistant.getByRole('button', { name: 'Ya, tolak izin', exact: true }).click();
      await assistant.getByRole('heading', { name: 'Tidak ada izin menunggu review', exact: true }).waitFor();
      await assistant.getByRole('button', { name: 'Semua izin', exact: true }).click();
      await assistant.getByText('Izin diterima', { exact: true }).waitFor();
      await assistant.getByText('Izin ditolak', { exact: true }).waitFor();
      assert.equal(await assistant.getByRole('button', { name: /^Terima izin / }).count(), 0);
      assert.equal((await otherLeave.get()).data().decision, 'rejected');
      await screenshot(assistant, 'review-izin-desktop.png');
    });

    await t.test('AI changes remain advisory; private route guards work and no pages overflow', async () => {
      await assistant.goto(`${url}/izin/demo-second`);
      await assistant.getByText('Klasifikasi AI sedang diproses', { exact: true }).waitFor();
      await secondLeave.update({ classification: { status: 'classified', category: 'Sakit' } });
      await assistant.getByText('Kategori AI: Sakit', { exact: true }).waitFor();
      assert.equal((await secondLeave.get()).data().decision, 'pending');
      await student.goto(`${url}/izin/demo-mobile`);
      await student.getByRole('heading', { name: 'Halaman izin tidak tersedia', exact: true }).waitFor();
      assert.equal(await student.getByText(longName, { exact: true }).count(), 0);
      await assistant.goto(`${url}/izin`);
      await assistant.getByRole('heading', { name: 'Halaman izin tidak tersedia', exact: true }).waitFor();
      await student.goto(`${url}/rekap/demo-mobile`);
      await student.getByRole('heading', { name: 'Rekap hanya tersedia untuk asisten sesi ini', exact: true }).waitFor();
      await assistant.goto(`${url}/izin/missing-session`);
      await assistant.getByRole('heading', { name: 'Halaman izin tidak tersedia', exact: true }).waitFor();
      for (const page of [assistant, student]) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
    });
  } finally {
    await browser.close();
    await deleteApp(adminApp);
  }
});
