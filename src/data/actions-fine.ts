import type { DemoState } from './demo-seed';
import type { Attendance, Lab, LeaveRequest, NotificationType, Session } from './types';

export type FineNotify = (
  draft: DemoState,
  recipients: string[],
  type: NotificationType,
  title: string,
  body: string,
  href?: string,
) => number;

// ponytail: Commit 0 stubs wired into checkIn/reviewLeave; Yudha implements SRS-4.4 here.
export function onAttendanceRecorded(
  _draft: DemoState,
  _attendance: Attendance,
  _session: Session,
  _lab: Lab | undefined,
  _notify: FineNotify,
): void {}

export function onLeaveApproved(_draft: DemoState, _leave: LeaveRequest, _session: Session): void {}
