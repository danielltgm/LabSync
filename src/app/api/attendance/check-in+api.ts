import { handleAttendanceCheckInRequest } from '@/server/attendance/check-in-handler';

export function POST(request: Request) {
  return handleAttendanceCheckInRequest(request);
}
