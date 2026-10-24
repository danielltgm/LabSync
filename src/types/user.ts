export type UserRole = 'ASISTEN' | 'PRAKTISAN';

export interface UserProfile {
  id: string;
  name: string;
  identifier: string; // NIM atau kode asisten
  role: UserRole;
  className?: string;
}
