const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require('playwright');

const url = process.env.LABSYNC_WEB_URL ?? 'http://localhost:8081';

async function signIn(page, email, password) {
  await page.goto(url);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata sandi').fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByRole('heading', { name: 'Jadwal praktikum' }).waitFor();
}

test('two accounts see a session open and close without a refresh', { timeout: 90000 }, async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const assistant = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const student = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const browserErrors = [];
  for (const page of [assistant, student]) {
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
  }
  try {
    await Promise.all([
      signIn(assistant, 'assistant@labsync.example', process.env.LABSYNC_ASSISTANT_PASSWORD ?? 'labsync-local'),
      signIn(student, 'student@labsync.example', process.env.LABSYNC_STUDENT_PASSWORD ?? 'labsync-local'),
    ]);
    await student.getByText('Sesi Belum Dibuka', { exact: true }).waitFor();
    await assistant.getByRole('button', { name: 'Buka Sesi', exact: true }).click();
    await assistant.getByRole('button', { name: 'Ya, Buka Sesi', exact: true }).click();
    await student.getByText('Presensi belum tersedia', { exact: true }).waitFor();
    const action = student.getByRole('button', { name: 'Presensi belum tersedia' });
    assert.equal(await action.isEnabled(), false);
    await assistant.getByRole('button', { name: 'Tutup Sesi', exact: true }).click();
    await assistant.getByRole('button', { name: 'Ya, Tutup Sesi', exact: true }).click();
    await student.getByText('Sesi Selesai', { exact: true }).waitFor();
    await student.reload();
    await student.getByText('Sesi Selesai', { exact: true }).waitFor();
    assert.equal(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await student.getByRole('button', { name: 'Riwayat Saya' }).click();
    await student.getByRole('heading', { name: 'Riwayat Kehadiran Saya' }).waitFor();
    await student.getByRole('button', { name: 'Kembali' }).click();
    await student.getByRole('button', { name: 'Keluar', exact: true }).click();
    await student.getByLabel('Email').waitFor();
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser.close();
  }
});
