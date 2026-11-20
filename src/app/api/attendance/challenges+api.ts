import { handleAttendanceChallengesRequest } from '@/server/attendance/challenge-api-handler';

export function POST(request: Request) {
  return handleAttendanceChallengesRequest(request);
}
