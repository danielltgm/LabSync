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

const attendanceAction = (payload = {}, checkInTime = '08:15:22') => ({
  type: 'submit_attendance',
  payload: {
    sessionId: 'mobile', studentId: '001', studentName: 'Agil', className: 'IF-3A',
    notes: 'PC-14', ...payload,
  },
  checkInTime,
});
const openStudentState = () => labSyncReducer(
  labSyncReducer(initial(), { type: 'open_session', sessionId: 'mobile' }),
  { type: 'set_role', role: 'PRAKTISAN' },
);

test('submitted attendance persists through role and identity switches', () => {
  const before = openStudentState();
  let state = labSyncReducer(before, attendanceAction());
  const record = {
    id: 'attendance-1', sessionId: 'mobile', studentId: '001', studentName: 'Agil',
    className: 'IF-3A', checkInTime: '08:15:22', notes: 'PC-14',
  };
  assert.deepEqual(state.attendances, [record]);
  assert.deepEqual(state.attendanceResult, { status: 'success', attendance: record });
  assert.equal(state.attendanceResult.attendance, state.attendances[0]);
  assert.deepEqual(before.attendances, []);
  assert.equal(before.attendanceResult, null);
  const records = state.attendances;

  for (const action of [
    { type: 'set_role', role: 'ASISTEN' },
    { type: 'set_role', role: 'PRAKTISAN' },
    { type: 'select_student', studentId: 'zufar' },
    { type: 'select_student', studentId: 'agil' },
  ]) {
    state = labSyncReducer(state, action);
    assert.equal(state.attendances, records);
    assert.deepEqual(state.attendances, [record]);
    assert.equal(state.attendanceResult, null);
  }
  assert.equal(getActiveUser(state).identifier, '001');
  state = labSyncReducer(state, attendanceAction({ notes: 'Changed' }, '09:00:00'));
  assert.deepEqual(state.attendanceResult, { status: 'duplicate', attendance: record });
  assert.equal(state.attendances, records);
});

test('queued submissions record exactly one attendance and retain the first notes and time', () => {
  const actions = [attendanceAction(), attendanceAction({ notes: 'PC-99' }, '09:30:45')];
  const first = labSyncReducer(openStudentState(), actions[0]);
  const queued = actions.reduce(labSyncReducer, openStudentState());
  assert.equal(queued.attendances.length, 1);
  assert.deepEqual(queued.attendances, first.attendances);
  assert.deepEqual(queued.attendanceResult, {
    status: 'duplicate', attendance: first.attendances[0],
  });
  assert.equal(queued.attendanceResult.attendance, queued.attendances[0]);
});

test('duplicate detection uses NIM rather than the selected user profile id', () => {
  const alias = { ...users[1], id: 'agil-alias' };
  let state = createLabSyncState([...users, alias], sessions);
  state = labSyncReducer(state, { type: 'open_session', sessionId: 'mobile' });
  state = labSyncReducer(state, { type: 'set_role', role: 'PRAKTISAN' });
  state = labSyncReducer(state, attendanceAction());
  const records = state.attendances;
  state = labSyncReducer(state, { type: 'select_student', studentId: alias.id });
  state = labSyncReducer(state, attendanceAction({ notes: 'Replacement' }, '10:00:00'));
  assert.equal(state.attendances, records);
  assert.equal(state.attendances.length, 1);
  assert.deepEqual(state.attendanceResult, { status: 'duplicate', attendance: records[0] });
});

test('different identities in one session and one identity in different sessions can attend', () => {
  let state = createLabSyncState(users, [sessions[0], { ...sessions[0], id: 'web' }]);
  for (const sessionId of ['mobile', 'web']) {
    state = labSyncReducer(state, { type: 'open_session', sessionId });
  }
  state = labSyncReducer(state, { type: 'set_role', role: 'PRAKTISAN' });
  state = labSyncReducer(state, attendanceAction());
  assert.equal(state.attendanceResult.status, 'success');
  state = labSyncReducer(state, { type: 'select_student', studentId: 'zufar' });
  state = labSyncReducer(state, attendanceAction({ studentId: '002', studentName: 'Zufar' }));
  assert.equal(state.attendanceResult.status, 'success');
  state = labSyncReducer(state, { type: 'select_student', studentId: 'agil' });
  state = labSyncReducer(state, attendanceAction({ sessionId: 'web' }));
  assert.equal(state.attendanceResult.status, 'success');
  assert.deepEqual(state.attendances.map(({ sessionId, studentId }) => [sessionId, studentId]), [
    ['mobile', '001'], ['mobile', '002'], ['web', '001'],
  ]);
  assert.equal(new Set(state.attendances.map(({ id }) => id)).size, 3);
});

test('assistant and missing active student identities cannot submit attendance', async (t) => {
  const submitted = labSyncReducer(openStudentState(), attendanceAction());
  const cases = [
    ['assistant', labSyncReducer(submitted, { type: 'set_role', role: 'ASISTEN' })],
    ['null active identity', { ...submitted, activeStudentId: null }],
    ['unknown active identity', { ...submitted, activeStudentId: 'missing' }],
    ['assistant selected as student', { ...submitted, activeStudentId: 'assistant' }],
    ['no users', createLabSyncState([], sessions)],
  ];
  for (const [label, before] of cases) {
    await t.test(label, () => {
      const state = labSyncReducer(before, attendanceAction());
      assert.equal(state.attendanceResult.status, 'error');
      assert.equal(typeof state.attendanceResult.message, 'string');
      assert.ok(state.attendanceResult.message.length > 0);
      assert.equal(state.attendances, before.attendances);
    });
  }
});

test('missing, scheduled and closed sessions reject attendance', async (t) => {
  for (const status of ['missing', 'TERJADWAL', 'SELESAI']) {
    await t.test(status, () => {
      const before = createLabSyncState(users.slice(1), status === 'missing'
        ? [] : [{ ...sessions[0], status }]);
      const state = labSyncReducer(before, attendanceAction());
      assert.equal(state.attendanceResult.status, 'error');
      assert.equal(state.attendances, before.attendances);
      assert.deepEqual(state.attendances, []);
    });
  }
});

test('a form prepared while open cannot submit after the assistant closes the session', () => {
  let state = openStudentState();
  const staleAction = attendanceAction();
  state = labSyncReducer(state, { type: 'set_role', role: 'ASISTEN' });
  state = labSyncReducer(state, { type: 'close_session', sessionId: 'mobile' });
  state = labSyncReducer(state, { type: 'set_role', role: 'PRAKTISAN' });
  assert.equal(state.sessions[0].status, 'SELESAI');
  const rejected = labSyncReducer(state, staleAction);
  assert.equal(rejected.attendanceResult.status, 'error');
  assert.equal(rejected.attendances, state.attendances);
  assert.deepEqual(rejected.attendances, []);
});

test('mismatched and blank identity or session fields reject without changing records', async (t) => {
  const before = labSyncReducer(openStudentState(), attendanceAction());
  const payloads = [
    { studentId: '002' }, { studentId: 'agil' }, { studentName: 'Zufar' },
    { studentId: '002', studentName: 'Zufar' }, { className: 'IF-3B' },
    { className: ' IF-3A ' }, { sessionId: 'missing' },
  ];
  for (const field of ['studentId', 'studentName', 'className', 'sessionId']) {
    for (const value of ['', ' \t\n ']) payloads.push({ [field]: value });
  }
  for (const payload of payloads) {
    await t.test(JSON.stringify(payload), () => {
      const state = labSyncReducer(before, attendanceAction(payload));
      assert.equal(state.attendanceResult.status, 'error');
      assert.equal(state.attendances, before.attendances);
      assert.equal(state.attendances.length, 1);
      assert.equal(before.attendanceResult.status, 'success');
    });
  }
});

test('names, NIM and notes are trimmed before attendance is recorded', () => {
  const state = labSyncReducer(openStudentState(), attendanceAction({
    studentId: ' \t001\n ', studentName: '\n Agil \t', notes: ' \tPC-14\n ',
  }));
  assert.equal(state.attendanceResult.status, 'success');
  assert.equal(state.attendances[0].studentId, '001');
  assert.equal(state.attendances[0].studentName, 'Agil');
  assert.equal(state.attendances[0].notes, 'PC-14');
});

test('missing, empty and whitespace-only optional notes are accepted without stored text', () => {
  for (const notes of [undefined, '', ' \t\n ']) {
    const state = labSyncReducer(openStudentState(), attendanceAction({ notes }));
    assert.equal(state.attendanceResult.status, 'success');
    assert.equal(state.attendances.length, 1);
    assert.equal(state.attendances[0].notes, undefined);
  }
});

test('check-in time requires HH:mm:ss with valid clock ranges', async (t) => {
  for (const time of ['00:00:00', '08:15:22', '23:59:59']) {
    await t.test(`accepts ${time}`, () => {
      const state = labSyncReducer(openStudentState(), attendanceAction({}, time));
      assert.equal(state.attendanceResult.status, 'success');
      assert.equal(state.attendances[0].checkInTime, time);
    });
  }
  for (const time of ['', '   ', '8:15:22', '08:5:22', '08:15:2', '08:15',
    '24:00:00', '12:60:00', '12:00:60', '-1:00:00', ' 08:15:22 ', '08:15:22.000']) {
    await t.test(`rejects ${JSON.stringify(time)}`, () => {
      const before = openStudentState();
      const state = labSyncReducer(before, attendanceAction({}, time));
      assert.equal(state.attendanceResult.status, 'error');
      assert.equal(state.attendances, before.attendances);
      assert.deepEqual(state.attendances, []);
    });
  }
});

test('clearing success, duplicate or error feedback never clears attendance records', () => {
  const success = labSyncReducer(openStudentState(), attendanceAction());
  const duplicate = labSyncReducer(success, attendanceAction());
  const error = labSyncReducer(success, attendanceAction({ studentName: 'Other' }));
  assert.deepEqual([success, duplicate, error].map((state) => state.attendanceResult.status),
    ['success', 'duplicate', 'error']);
  for (const before of [success, duplicate, error]) {
    const state = labSyncReducer(before, { type: 'clear_attendance_result' });
    assert.equal(state.attendanceResult, null);
    assert.equal(state.attendances, before.attendances);
    assert.deepEqual(state.attendances, success.attendances);
    assert.equal(state.sessions, before.sessions);
    assert.equal(state.users, before.users);
    assert.equal(labSyncReducer(state, { type: 'clear_attendance_result' }), state);
  }
  const fresh = initial();
  assert.equal(labSyncReducer(fresh, { type: 'clear_attendance_result' }), fresh);
});

test('fresh states have independent empty attendance and leave frozen seeds unchanged', () => {
  const frozenUsers = Object.freeze(users.map((user) => Object.freeze({ ...user })));
  const frozenSessions = Object.freeze(sessions.map((session) => Object.freeze({ ...session })));
  const before = createLabSyncState(frozenUsers, frozenSessions);
  assert.deepEqual(before.attendances, []);
  assert.equal(before.attendanceResult, null);
  assert.notEqual(before.users, frozenUsers);
  assert.notEqual(before.sessions, frozenSessions);
  before.users.forEach((user, index) => assert.notEqual(user, frozenUsers[index]));
  before.sessions.forEach((session, index) => assert.notEqual(session, frozenSessions[index]));
  let state = labSyncReducer(before, { type: 'open_session', sessionId: 'mobile' });
  state = labSyncReducer(state, { type: 'set_role', role: 'PRAKTISAN' });
  state = labSyncReducer(state, attendanceAction());
  assert.equal(state.attendanceResult.status, 'success');
  state = labSyncReducer(state, { type: 'set_role', role: 'ASISTEN' });
  state = labSyncReducer(state, { type: 'close_session', sessionId: 'mobile' });
  assert.equal(state.sessions[0].status, 'SELESAI');
  assert.equal(state.attendances.length, 1);
  assert.deepEqual(before.attendances, []);
  assert.equal(before.attendanceResult, null);
  assert.equal(before.sessions[0].status, 'TERJADWAL');
  assert.deepEqual(frozenUsers, users);
  assert.deepEqual(frozenSessions, sessions);
  const fresh = createLabSyncState(frozenUsers, frozenSessions);
  assert.deepEqual(fresh.attendances, []);
  assert.equal(fresh.attendanceResult, null);
  assert.notEqual(fresh.attendances, before.attendances);
  assert.notEqual(fresh.attendances, state.attendances);
  assert.equal(fresh.sessions[0].status, 'TERJADWAL');
});
