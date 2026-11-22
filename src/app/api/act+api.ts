import { handleAct } from '@/server/act';

export function POST(request: Request) {
  return handleAct(request);
}
