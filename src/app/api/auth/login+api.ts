import { handleLogin } from '@/server/auth-routes';

export function POST(request: Request) {
  return handleLogin(request);
}
