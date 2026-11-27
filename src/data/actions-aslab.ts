import type { DemoState } from './demo-seed';
import type { Lab, User } from './types';

export interface TransferStudentInput {
  fromClassId: string;
  toClassId: string;
  nims: string[];
}

export interface BulkLabsInput {
  courseId: string;
  labs: Lab[];
}

export interface BulkStudentsInput {
  classId: string;
  students: Pick<User, 'nim' | 'name' | 'email' | 'angkatan'>[];
}

export interface BulkAssistantsInput {
  classId: string;
  assistants: Pick<User, 'nim' | 'name' | 'email' | 'phone'>[];
}

// ponytail: Commit 0 stubs wired into actions.ts/act.ts; Daniel implements SRS-4.1 here.
export function transferStudent(_draft: DemoState, _input: TransferStudentInput): number {
  return 0;
}

export function bulkInsertLabs(_draft: DemoState, _input: BulkLabsInput): number {
  return 0;
}

export function bulkInsertStudents(_draft: DemoState, _input: BulkStudentsInput): number {
  return 0;
}

export function bulkInsertAssistants(_draft: DemoState, _input: BulkAssistantsInput): number {
  return 0;
}
