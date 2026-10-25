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

const payload = { sessionId: 'mobile', studentId: '001', studentName: 'Agil', className: 'IF-3A', notes: ' PC-14 ' };
const checkIn = (state, values = payload, checkInTime = '08:15:22') =>
  labSyncReducer(state, { type: 'check_in', payload: values, checkInTime });
function readyStudent() {
  const opened = labSyncReducer(initial(), { type: 'open_session', sessionId: 'mobile' });
  return labSyncReducer(opened, { type: 'set_role', role: 'PRAKTISAN' });
}

test('check-in updates shared attendance with canonical identity and time, without mutating seeds', () => {
  const state = readyStudent();
  const checked = checkIn(state);
  assert.equal(checked.checkInResult.kind, 'success');
  assert.equal(checked.attendances.length, 1);
  assert.equal(checked.attendances[0].studentName, 'Agil');
  assert.equal(checked.attendances[0].notes, 'PC-14');
  assert.equal(checked.attendances[0].checkInTime, '08:15:22');
  assert.equal(state.attendances.length, 0);
});

test('repeated submits and whitespace variants cannot add duplicate attendance', () => {
  const first = checkIn(readyStudent());
  const second = checkIn(first, { ...payload, studentId: ' 001 ' }, '08:15:23');
  assert.equal(second.attendances.length, 1);
  assert.equal(second.checkInResult.kind, 'duplicate');
  assert.equal(second.checkInResult.attendance.checkInTime, '08:15:22');
});

test('attendance is isolated by both student and session', () => {
  let state = checkIn(readyStudent());
  state = labSyncReducer(state, { type: 'select_student', studentId: 'zufar' });
  state = checkIn(state, { ...payload, studentId: '002', studentName: 'Zufar' });
  assert.equal(state.attendances.length, 2);
  assert.equal(state.checkInResult.kind, 'success');
  const another = { ...sessions[0], id: 'database', status: 'DIBUKA' };
  state = { ...state, sessions: [...state.sessions, another] };
  state = checkIn(state, { ...payload, sessionId: 'database', studentId: '002', studentName: 'Zufar' });
  assert.equal(state.attendances.length, 3);
});

test('assistant, wrong identity, scheduled and closed-session check-ins are rejected', () => {
  assert.equal(checkIn(initial()).checkInResult.kind, 'error');
  assert.equal(checkIn(readyStudent(), { ...payload, studentId: '002', studentName: 'Zufar' }).attendances.length, 0);
  assert.equal(checkIn(readyStudent(), { ...payload, sessionId: 'missing' }).checkInResult.kind, 'error');
  const scheduled = labSyncReducer(initial(), { type: 'set_role', role: 'PRAKTISAN' });
  assert.equal(checkIn(scheduled).attendances.length, 0);
  let closed = labSyncReducer(initial(), { type: 'open_session', sessionId: 'mobile' });
  closed = labSyncReducer(closed, { type: 'close_session', sessionId: 'mobile' });
  closed = labSyncReducer(closed, { type: 'set_role', role: 'PRAKTISAN' });
  assert.equal(checkIn(closed).checkInResult.kind, 'error');
  assert.equal(checkIn(closed).attendances.length, 0);
});

test('invalid form values and timestamps never create a record', () => {
  for (const values of [
    { ...payload, studentId: '' }, { ...payload, studentId: 'abc' },
    { ...payload, studentName: '' }, { ...payload, notes: 'x'.repeat(51) },
  ]) assert.equal(checkIn(readyStudent(), values).checkInResult.kind, 'error');
  assert.equal(checkIn(readyStudent(), payload, '25:61:00').checkInResult.kind, 'error');
});

test('role/identity changes clear feedback and preserve recorded attendance', () => {
  let state = checkIn(readyStudent());
  state = labSyncReducer(state, { type: 'select_student', studentId: 'zufar' });
  assert.equal(state.checkInResult, null);
  assert.equal(state.attendances.length, 1);
  state = labSyncReducer(state, { type: 'set_role', role: 'ASISTEN' });
  assert.equal(state.attendances[0].studentId, '001');
  assert.equal(state.checkInResult, null);
});
