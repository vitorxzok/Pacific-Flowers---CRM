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
  sender: 'client' | 'attendant' | 'system';
  text: string;
  timestamp: string; // ISO date string
  read?: boolean;
  media_url?: string;
  media_type?: string;
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
  custom_reposicao_date?: string;
  is_exported?: boolean;
  connected_instance?: string;
}

export interface Attachment {
  id: string;
  trigger: string;
  url: string;
  name: string;
  type: string; // 'document', 'image', etc.
}

export interface CadenceStep {
  id: string;
  text: string;
  waitHours: number;
}

export interface Settings {
  autoReplyEnabled: boolean;
  minutesWithoutResponse: number;
  followUpIntervalHours: number;
  insistenciaMaxRepetitions?: number;
  insistenciaDaysInterval?: number;
  useGlobalInsistenceStrategy?: boolean;
  insistenciaCadences?: CadenceStep[];
  reposicao_days_global?: number;
  kanbanColumns: string[];
  kanbanColumnNames?: Record<string, string>;
  businessName?: string;
  businessContext?: string;
  productsCatalog?: string;
  attachments?: Attachment[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
}
