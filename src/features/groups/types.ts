export interface Group {
  id: string;
  name: string;
  description: string;
  participantLimit: number; // Max 10 per ADR-05
  participants: string[];   // Normalized lowercase 0x addresses
  createdAt: string;
  status: 'active' | 'archived';
}

export interface CreateGroupInput {
  name: string;
  description: string;
  participantLimit?: number;
  initialParticipants?: string[];
}
