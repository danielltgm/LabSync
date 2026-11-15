import { readClassParticipants } from '@/server/class-participants';

export function GET(request: Request, params: { id?: string }) {
  return readClassParticipants(request, params.id);
}
