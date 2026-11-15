import { classifySavedLeave } from '@/server/classify-leave';

export function POST(request: Request, params: { id?: string }) {
  return classifySavedLeave(request, params.id);
}
