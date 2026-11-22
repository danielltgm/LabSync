import { handleCloseSessionRequest } from '@/server/attendance/close-session-handler';

export function POST(request: Request) {
  return handleCloseSessionRequest(request);
}
