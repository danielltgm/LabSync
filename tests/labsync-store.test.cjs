const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createLabSyncState, getActiveUser, labSyncReducer } = require('../src/state/labsync-store.ts');

const users = [
  { id: 'assistant', name: 'Yudha', identifier: 'AST-001', role: 'ASISTEN' },
  { id: 'agil', name: 'Agil', identifier: '001', role: 'PRAKTISAN' },
  { id: 'zufar', name: 'Zufar', identifier: '002', role: 'PRAKTISAN' },
];
const sessions = [{
  id: 'mobile', courseName: 'Mobile', className: 'IF-3A', labRoom: 'Lab RPL',
  startTime: '08:00', endTime: '10:00', date: '2026-10-22',
  status: 'TERJADWAL', assistantName: 'Yudha',
}];
const initial = () => createLabSyncState(users, sessions);

test('open then close is terminal, duplicate or stale confirmations are ignored', () => {
  const opened = labSyncReducer(initial(), { type: 'open_session', sessionId: 'mobile' });
  assert.equal(opened.sessions[0].status, 'DIBUKA');
  assert.equal(labSyncReducer(opened, { type: 'open_session', sessionId: 'mobile' }), opened);
  const closed = labSyncReducer(opened, { type: 'close_session', sessionId: 'mobile' });
  assert.equal(closed.sessions[0].status, 'SELESAI');
  assert.equal(labSyncReducer(closed, { type: 'open_session', sessionId: 'mobile' }), closed);
  assert.equal(labSyncReducer(closed, { type: 'close_session', sessionId: 'mobile' }), closed);
  assert.equal(sessions[0].status, 'TERJADWAL');
  assert.equal(initial().sessions[0].status, 'TERJADWAL');
});

test('a role switch before confirmation prevents a student from changing sessions', () => {
  const student = labSyncReducer(initial(), { type: 'set_role', role: 'PRAKTISAN' });
  assert.equal(labSyncReducer(student, { type: 'open_session', sessionId: 'mobile' }), student);
  const opened = labSyncReducer(initial(), { type: 'open_session', sessionId: 'mobile' });
  const switched = labSyncReducer(opened, { type: 'set_role', role: 'PRAKTISAN' });
  assert.equal(labSyncReducer(switched, { type: 'close_session', sessionId: 'mobile' }), switched);
});

test('invalid ids, wrong assistant and invalid transitions leave state unchanged', () => {
  const state = initial();
  assert.equal(labSyncReducer(state, { type: 'open_session', sessionId: 'missing' }), state);
  assert.equal(labSyncReducer(state, { type: 'close_session', sessionId: 'mobile' }), state);
  const other = createLabSyncState(users, [{ ...sessions[0], assistantName: 'Other' }]);
  assert.equal(labSyncReducer(other, { type: 'open_session', sessionId: 'mobile' }), other);
});

test('selected identity and session state survive role changes', () => {
  let state = labSyncReducer(initial(), { type: 'open_session', sessionId: 'mobile' });
  state = labSyncReducer(state, { type: 'set_role', role: 'PRAKTISAN' });
  state = labSyncReducer(state, { type: 'select_student', studentId: 'zufar' });
  assert.equal(getActiveUser(state).identifier, '002');
  state = labSyncReducer(state, { type: 'set_role', role: 'ASISTEN' });
  assert.equal(getActiveUser(state).name, 'Yudha');
  state = labSyncReducer(state, { type: 'set_role', role: 'PRAKTISAN' });
  assert.equal(getActiveUser(state).name, 'Zufar');
  assert.equal(state.sessions[0].status, 'DIBUKA');
  assert.equal(labSyncReducer(state, { type: 'select_student', studentId: 'assistant' }), state);
});

test('empty seeds are safe and cannot invent an assistant identity', () => {
  const state = createLabSyncState([], []);
  assert.equal(getActiveUser(state), undefined);
  assert.equal(labSyncReducer(state, { type: 'set_role', role: 'ASISTEN' }), state);
  assert.equal(labSyncReducer(state, { type: 'open_session', sessionId: 'mobile' }), state);
});
