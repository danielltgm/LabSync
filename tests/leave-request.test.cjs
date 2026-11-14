const assert = require('node:assert/strict');
const { test } = require('node:test');
const { classificationLabel, formatLeaveDateTime, leaveReviewErrorMessage } = require('../src/utils/leave-request.ts');

test('classification distinguishes pending, unavailable and actual instructor categories', () => {
  assert.equal(classificationLabel({ status: 'pending' }), 'Klasifikasi AI sedang diproses');
  assert.equal(classificationLabel({ status: 'unavailable' }), 'Klasifikasi AI belum tersedia');
  assert.equal(classificationLabel({ status: 'classified', category: 'Sakit' }), 'Kategori AI: Sakit');
  assert.equal(formatLeaveDateTime(null), 'Menunggu sinkronisasi');
  assert.match(formatLeaveDateTime(Date.parse('2026-11-15T01:02:00Z')), /08[.:]02/);
});

test('review errors explain conflicts, permission failures and retry without exposing SDK details', () => {
  assert.match(leaveReviewErrorMessage(new Error('already-reviewed')), /sudah direview/);
  assert.match(leaveReviewErrorMessage({ code: 'permission-denied' }), /tidak memiliki akses/);
  assert.match(leaveReviewErrorMessage(new Error('request-not-found')), /tidak tersedia/);
  assert.match(leaveReviewErrorMessage(new Error('internal stack and secrets')), /Periksa koneksi/);
});
