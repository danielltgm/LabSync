export interface ClassParticipant {
  uid: string;
  name: string;
  identifier: string;
  enrolled: boolean;
}

export interface ParticipantPage {
  students: ClassParticipant[];
  nextCursor?: string;
}
