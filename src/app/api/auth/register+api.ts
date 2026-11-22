import { handleRegister } from '@/server/auth-routes';

export function POST(request: Request) {
  return handleRegister(request);
}
