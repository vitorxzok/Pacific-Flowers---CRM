import { create } from 'zustand';
import { Client, ClientStatus, Settings } from '../types';
import { createClient } from '@/lib/supabase/client';

interface CRMStore {
  clients: Client[];
  settings: Settings;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  fetchClients: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateClientStatus: (clientId: string, newStatus: ClientStatus) => Promise<void>;
  addClientNote: (clientId: string, note: string) => Promise<void>;
  updateClientNotes: (clientId: string, notes: string) => Promise<void>;
  updateClientTags: (clientId: string, tags: string[]) => Promise<void>;
  addKanbanColumn: (columnName: string) => Promise<void>;
  removeKanbanColumn: (columnName: string) => Promise<void>;
  addMessage: (clientId: string, message: { text: string, sender: 'client' | 'attendant' }) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  updateClientAIEnabled: (clientId: string, enabled: boolean) => Promise<void>;
  updateClientReposicaoDate: (clientId: string, date: string | null) => Promise<void>;
  fetchAdminClients: (password: string) => Promise<boolean>;
}

const supabase = createClient();

export const useCRMStore = create<CRMStore>((set, get) => ({
  clients: [],
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  settings: {
    autoReplyEnabled: false,
    minutesWithoutResponse: 15,
    followUpIntervalHours: 24,
    insistenciaMaxRepetitions: 3,
    insistenciaDaysInterval: 2,
    reposicao_days_global: 30,
    kanbanColumns: ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'],
    businessName: '',
    businessContext: '',
    productsCatalog: ''
  },
  
  setSettings: async (newSettings) => {
    const state = get();
    const merged = { ...state.settings, ...newSettings };
    set({ settings: merged });
    
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_reply_enabled: merged.autoReplyEnabled,
          minutes_without_response: merged.minutesWithoutResponse,
          followup_interval_hours: merged.followUpIntervalHours,
          insistencia_max_repetitions: merged.insistenciaMaxRepetitions,
          insistencia_days_interval: merged.insistenciaDaysInterval,
          reposicao_days_global: merged.reposicao_days_global,
          kanban_columns: merged.kanbanColumns,
          business_name: merged.businessName,
          business_context: merged.businessContext,
          products_catalog: merged.productsCatalog
        })
      });
    } catch (error) {
      console.error("Erro ao salvar configuracoes:", error);
    }
  },

  fetchSettings: async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        set({ settings: {
          autoReplyEnabled: data.auto_reply_enabled || false,
          minutesWithoutResponse: data.minutes_without_response || 15,
          followUpIntervalHours: data.followup_interval_hours || 24,
          insistenciaMaxRepetitions: data.insistencia_max_repetitions || 3,
          insistenciaDaysInterval: data.insistencia_days_interval || 2,
          reposicao_days_global: data.reposicao_days_global || 30,
          kanbanColumns: data.kanban_columns || ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'],
          businessName: data.business_name || '',
          businessContext: data.business_context || '',
          productsCatalog: data.products_catalog || ''
        }});
      }
    } catch (error) {
      console.error("Erro ao buscar configuracoes:", error);
    }
  },

  updateClientReposicaoDate: async (clientId, date) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, custom_reposicao_date: date || undefined } : c
      ),
    }));

    const { error } = await supabase
      .from('clientes')
      .update({ custom_reposicao_date: date, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) console.error("Error updating reposicao date:", error);
  },

  fetchClients: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const userId = session.user.id;

    const { data, error } = await supabase
      .from('clientes')
      .select('*, profiles(name), cliente_tags(tags(name, color)), mensagens(*)')
      .eq('attendant_id', userId);
      
    if (error) {
      console.error("Error fetching clients:", error);
      return;
    }

    const formattedClients: Client[] = data.map((c: any) => ({
      id: c.id,
      name: c.name || 'Desconhecido',
      phone: c.phone || '',
      email: c.email || '',
      status: c.status as ClientStatus,
      storeName: c.store_name || '',
      purchaseValue: c.purchase_value ? Number(c.purchase_value) : undefined,
      purchaseDate: c.purchase_date || undefined,
      insistencia_count: c.insistencia_count || 0,
      tags: c.cliente_tags ? c.cliente_tags.map((ct: any) => ct.tags?.name).filter(Boolean) : [],
      attendant: c.profiles?.name || '',
      avatarUrl: undefined,
      notes: c.notes || '',
      ai_enabled: c.ai_enabled !== false,
      needs_human: c.needs_human,
      messages: c.mensagens ? c.mensagens.map((m: any) => ({
        id: m.id,
        text: m.text,
        sender: m.sender === 'client' ? 'client' : m.sender,
        timestamp: m.timestamp || new Date().toISOString(),
        read: m.read || true,
      })) : [],
      history: c.mensagens ? c.mensagens.map((m: any) => ({
        id: m.id,
        type: 'message',
        date: m.timestamp || new Date().toISOString(),
        description: `Mensagem: ${m.text}`
      })) : [],
    }));

    set({ clients: formattedClients });
  },

  fetchAdminClients: async (password: string) => {
    try {
      const response = await fetch(`/api/admin/clients?pwd=${password}`);
      if (!response.ok) return false;
      
      const { clients } = await response.json();
      set({ clients });
      return true;
    } catch (error) {
      console.error("Erro ao buscar clientes admin:", error);
      return false;
    }
  },

  updateClientStatus: async (clientId, newStatus) => {
    // Optimistic UI update
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, status: newStatus } : c
      ),
    }));
    
    const { error } = await supabase
      .from('clientes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', clientId);
      
    if (error) console.error("Error updating status:", error);
  },

  addClientNote: async (clientId, note) => {
    const client = get().clients.find(c => c.id === clientId);
    if (!client) return;
    const updatedNotes = client.notes ? `${client.notes}\n${note}` : note;
    
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, notes: updatedNotes } : c
      ),
    }));

    const { error } = await supabase
      .from('clientes')
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) console.error("Error updating notes:", error);
  },

  updateClientNotes: async (clientId, notes) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, notes } : c
      ),
    }));

    const { error } = await supabase
      .from('clientes')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) console.error("Error updating notes:", error);
  },

  addMessage: async (clientId, message) => {
    // 1. Otimisticamente adicionar na tela
    const tempId = crypto.randomUUID();
    const newMessage = {
      id: tempId,
      ...message,
      timestamp: new Date().toISOString(),
      read: true
    };
    
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, messages: [...c.messages, newMessage] } : c
      ),
    }));

    // Se a mensagem for do atendente, enviamos para a API
    if (message.sender === 'attendant') {
      const client = get().clients.find(c => c.id === clientId);
      if (!client) return;

      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientId,
            text: message.text,
            phone: client.phone
          })
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Erro ao enviar mensagem via Evolution API:", data.error);
          // Opcional: reverter estado otimista ou marcar mensagem com erro
        }
      } catch (err) {
        console.error("Erro na requisição para enviar mensagem:", err);
      }
    } else {
      // Se por algum motivo for do cliente (ex: mock/teste), mantemos o insert via client side
      const { error } = await supabase.from('mensagens').insert({
        client_id: clientId,
        text: message.text,
        sender: message.sender,
        read: true
      });
      if (error) console.error("Error adding message:", error);
    }
  },

  updateClientTags: async (clientId, tags) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, tags } : c
      ),
    }));
  },

  addKanbanColumn: async (columnName) => {
    const currentCols = get().settings.kanbanColumns;
    if (currentCols.includes(columnName)) return;
    const newCols = [...currentCols, columnName];
    await get().setSettings({ kanbanColumns: newCols });
  },

  removeKanbanColumn: async (columnName) => {
    const currentCols = get().settings.kanbanColumns;
    const newCols = currentCols.filter(c => c !== columnName);
    await get().setSettings({ kanbanColumns: newCols });
  },

  deleteClient: async (clientId) => {
    // Optimistic UI update
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== clientId),
    }));

    // Remover mensagens primeiro (caso o banco não tenha cascade delete configurado)
    await supabase.from('mensagens').delete().eq('client_id', clientId);
    
    // Remover o cliente
    const { error } = await supabase.from('clientes').delete().eq('id', clientId);

    if (error) {
      console.error("Error deleting client:", error);
      // Opcional: Reverter estado em caso de erro
      await get().fetchClients();
    }
  },

  updateClientAIEnabled: async (clientId: string, enabled: boolean) => {
    // Optimistic UI update
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, ai_enabled: enabled } : c
      ),
    }));

    const { error } = await supabase
      .from('clientes')
      .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) console.error("Error updating ai_enabled:", error);
  },
}));
