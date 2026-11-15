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

test('two accounts share attendance, leave decisions and session status', { timeout: 90000 }, async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const assistant = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const student = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const browserErrors = [];
  const httpErrors = [];
  for (const page of [assistant, student]) {
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) httpErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
  }
  try {
    await Promise.all([
      signIn(assistant, 'assistant@labsync.example', process.env.LABSYNC_ASSISTANT_PASSWORD ?? 'labsync-local'),
      signIn(student, 'student@labsync.example', process.env.LABSYNC_STUDENT_PASSWORD ?? 'labsync-local'),
    ]);
    await assistant.getByRole('button', { name: 'Kelola Kelas & Sesi' }).click();
    await assistant.getByRole('button', { name: 'Kelola kelas IF-3A Demo', exact: true }).click();
    await assistant.getByRole('button', { name: '+ Tambah Sesi' }).click();
    await assistant.getByLabel('Nama Praktikum').fill('Praktikum Jaringan');
    await assistant.getByPlaceholder('Contoh: Lab RPL / Lab Jaringan').fill('Lab Jaringan');
    await assistant.getByRole('button', { name: 'Buka kalender', exact: true }).click();
    await assistant.getByLabel('Tanggal manual', { exact: true }).fill('2026-11-22');
    await assistant.getByRole('button', { name: 'Pakai tanggal', exact: true }).click();
    await assistant.getByLabel('Jam Mulai', { exact: true }).fill('09:00');
    await assistant.getByRole('button', { name: 'Pilih durasi', exact: true }).click();
    await assistant.getByRole('button', { name: '120 menit', exact: true }).click();
    assert.equal(await assistant.getByLabel('Jam Selesai', { exact: true }).inputValue(), '11:00');
    await assistant.getByRole('button', { name: 'Simpan Jadwal Sesi' }).click();
    await assistant.getByText('Praktikum Jaringan', { exact: true }).filter({ visible: true }).first().waitFor();
    await assistant.getByRole('button', { name: 'Edit sesi Praktikum Jaringan' }).click();
    await assistant.getByLabel('Nama Praktikum').fill('Jaringan Komputer');
    await assistant.getByRole('button', { name: 'Simpan Jadwal Sesi' }).click();
    await assistant.getByText('Jaringan Komputer', { exact: true }).filter({ visible: true }).first().waitFor();
    await assistant.getByRole('button', { name: 'Kembali', exact: true }).click();
    await assistant.getByRole('button', { name: 'Kembali', exact: true }).click();
    await student.getByText('Jaringan Komputer', { exact: true }).filter({ visible: true }).first().waitFor();
    await student.getByText('Sesi Belum Dibuka', { exact: true }).first().waitFor();
    await assistant.getByRole('button', { name: 'Buka Sesi', exact: true }).first().click();
    await assistant.getByRole('button', { name: 'Ya, Buka Sesi', exact: true }).click();
    await student.getByText('Lakukan Presensi', { exact: true }).waitFor();
    const action = student.getByRole('button', { name: 'Lakukan Presensi' });
    assert.equal(await action.isEnabled(), true);
    await action.click();
    await student.getByLabel('Catatan atau nomor PC').fill('PC-14');
    await student.getByRole('button', { name: 'Kirim Presensi' }).click();
    await student.getByText('Presensi Berhasil Dicatat!', { exact: true }).waitFor();
    await student.getByRole('button', { name: 'Selesai dan Tutup' }).click();
    await student.getByText('Sudah Presensi', { exact: true }).waitFor();
    if (process.env.LABSYNC_HOME_SCREENSHOT) {
      await assistant.setViewportSize({ width: 780, height: 880 });
      await assistant.screenshot({ path: process.env.LABSYNC_HOME_SCREENSHOT, animations: 'disabled' });
      await assistant.setViewportSize({ width: 1280, height: 800 });
    }
    await assistant.getByRole('button', { name: 'Lihat rekap Pemrograman Mobile' }).click();
    await assistant.getByText('Praktikan Demo', { exact: true }).filter({ visible: true }).first().waitFor();
    await assistant.getByRole('button', { name: 'Kembali', exact: true }).click();
    await assistant.getByRole('button', { name: 'Lihat rekap Jaringan Komputer' }).click();
    await student.getByRole('button', { name: 'Ajukan Izin' }).click();
    await student.getByLabel('Alasan Izin').fill('Ada jadwal ujian susulan.');
    await student.getByRole('button', { name: 'Kirim Izin' }).click();
    await assistant.getByRole('button', { name: 'Review izin sesi ini' }).click();
    await assistant.getByText('Ada jadwal ujian susulan.', { exact: true }).waitFor();
    await assistant.getByText(/Kategori AI: (?:Demo: )?Akademik/).first().waitFor();
    await assistant.getByRole('button', { name: 'Terima izin Praktikan Demo' }).click();
    await assistant.getByRole('button', { name: 'Ya, terima izin' }).click();
    await student.getByRole('button', { name: 'Status Izin Saya' }).click();
    await student.getByText('Izin diterima', { exact: true }).filter({ visible: true }).first().waitFor();
    await student.getByRole('button', { name: 'Kembali' }).click();
    await assistant.getByRole('button', { name: 'Kembali' }).click();
    await assistant.getByRole('button', { name: 'Kembali' }).click();
    await assistant.getByRole('button', { name: 'Tutup Sesi', exact: true }).click();
    await assistant.getByRole('button', { name: 'Ya, Tutup Sesi', exact: true }).click();
    await student.getByText('SELESAI (DITUTUP)', { exact: true }).filter({ visible: true }).first().waitFor();
    await student.reload();
    await student.getByText('SELESAI (DITUTUP)', { exact: true }).filter({ visible: true }).first().waitFor();
    assert.equal(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await student.getByRole('button', { name: 'Riwayat Saya' }).click();
    await student.getByRole('heading', { name: 'Riwayat Kehadiran Saya' }).waitFor();
    await student.getByRole('button', { name: 'Kembali' }).click();
    await student.getByRole('button', { name: 'Keluar', exact: true }).click();
    await student.getByLabel('Email').waitFor();
    assert.deepEqual(browserErrors, [], `Browser errors; failed requests: ${httpErrors.join(', ')}`);
  } finally {
    await browser.close();
  }
});
