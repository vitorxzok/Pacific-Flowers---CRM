export type ClientStatus = string;

export interface HistoryEvent {
  id: string;
  type: 'status_change' | 'note' | 'creation';
  date: string; // ISO date string
  description: string;
  fromStatus?: ClientStatus;
  toStatus?: ClientStatus;
}

export interface Message {
  id: string;
  sender: 'client' | 'attendant';
  text: string;
  timestamp: string; // ISO date string
  read?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: ClientStatus;
  attendant: string;
  tags: string[];
  notes: string;
  history: HistoryEvent[];
  messages: Message[];
  avatarUrl?: string;
  ai_enabled?: boolean;
}

export interface Settings {
  autoReplyEnabled: boolean;
  minutesWithoutResponse: number;
  followUpIntervalHours: number;
  kanbanColumns: string[];
}
