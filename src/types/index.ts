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
  storeName?: string;
  purchaseValue?: number;
  purchaseDate?: string;
  insistencia_count?: number;
  needs_human?: boolean;
}

export interface Attachment {
  id: string;
  trigger: string;
  url: string;
  name: string;
  type: string; // 'document', 'image', etc.
}

export interface Settings {
  autoReplyEnabled: boolean;
  minutesWithoutResponse: number;
  followUpIntervalHours: number;
  insistenciaMaxRepetitions?: number;
  insistenciaDaysInterval?: number;
  kanbanColumns: string[];
  businessName?: string;
  businessContext?: string;
  productsCatalog?: string;
  attachments?: Attachment[];
}
