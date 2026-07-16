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
  fetchAdminClients: (password: string) => Promise<boolean>;
  fetchClientMessages: (clientId: string) => Promise<void>;
  markMessagesAsRead: (clientId: string) => Promise<void>;
  updateClientStatus: (clientId: string, newStatus: ClientStatus) => Promise<void>;
  addClientNote: (clientId: string, note: string) => Promise<void>;
  updateClientNotes: (clientId: string, notes: string) => Promise<void>;
  updateClientTags: (clientId: string, tags: string[]) => Promise<void>;
  addKanbanColumn: (columnName: string) => Promise<void>;
  removeKanbanColumn: (columnName: string) => Promise<void>;
  addMessage: (clientId: string, message: { text: string, sender: 'client' | 'attendant' }) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  updateClientAIEnabled: (clientId: string, enabled: boolean) => Promise<void>;
  toggleNeedsHuman: (clientId: string, needsHuman: boolean) => Promise<void>;
  updateClientReposicaoDate: (clientId: string, date: string | null) => Promise<void>;
  fetchAdminClients: (password: string) => Promise<boolean>;
  markClientsAsExported: (clientIds: string[]) => Promise<void>;
  markMessagesAsRead: (clientId: string) => Promise<void>;
}

const supabase = createClient();

export const useCRMStore = create<CRMStore>((set, get) => ({
  clients: [],
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  settings: {
    autoReplyEnabled: false,
    audioRepliesEnabled: true,
    minutesWithoutResponse: 15,
    followUpIntervalHours: 24,
    insistenciaMaxRepetitions: 3,
    insistenciaDaysInterval: 2,
    useGlobalInsistenceStrategy: false,
    insistenciaCadences: [],
    reposicao_days_global: 30,
    kanbanColumns: ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'],
    kanbanColumnNames: {},
    businessName: '',
    businessContext: '',
    productsCatalog: '',
    attachments: [],
    workingHoursStart: '07:30',
    workingHoursEnd: '20:00'
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
          audio_replies_enabled: merged.audioRepliesEnabled,
          minutes_without_response: merged.minutesWithoutResponse,
          followup_interval_hours: merged.followUpIntervalHours,
          insistencia_max_repetitions: merged.insistenciaMaxRepetitions,
          insistencia_days_interval: merged.insistenciaDaysInterval,
          use_global_insistence_strategy: merged.useGlobalInsistenceStrategy,
          insistencia_cadences: merged.insistenciaCadences,
          reposicao_days_global: merged.reposicao_days_global,
          kanban_columns: merged.kanbanColumns,
          kanban_column_names: merged.kanbanColumnNames,
          business_name: merged.businessName,
          business_context: merged.businessContext,
          products_catalog: merged.productsCatalog,
          attachments: merged.attachments,
          working_hours_start: merged.workingHoursStart,
          working_hours_end: merged.workingHoursEnd
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
          autoReplyEnabled: data.auto_reply_enabled ?? data.autoReplyEnabled ?? false,
          audioRepliesEnabled: data.audio_replies_enabled ?? data.audioRepliesEnabled ?? true,
          minutesWithoutResponse: data.minutes_without_response ?? data.minutesWithoutResponse ?? 15,
          followUpIntervalHours: data.followup_interval_hours ?? data.followUpIntervalHours ?? 24,
          insistenciaMaxRepetitions: data.insistencia_max_repetitions ?? data.insistenciaMaxRepetitions ?? 3,
          insistenciaDaysInterval: data.insistencia_days_interval ?? data.insistenciaDaysInterval ?? 2,
          useGlobalInsistenceStrategy: data.use_global_insistence_strategy ?? data.useGlobalInsistenceStrategy ?? false,
          insistenciaCadences: data.insistencia_cadences ?? data.insistenciaCadences ?? [],
          reposicao_days_global: data.reposicao_days_global ?? 30,
          kanbanColumns: data.kanban_columns ?? data.kanbanColumns ?? ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'],
          kanbanColumnNames: data.kanban_column_names ?? data.kanbanColumnNames ?? {},
          businessName: data.business_name ?? data.businessName ?? '',
          businessContext: data.business_context ?? data.businessContext ?? '',
          productsCatalog: data.products_catalog ?? data.productsCatalog ?? '',
          attachments: data.attachments || [],
          workingHoursStart: data.working_hours_start ?? data.workingHoursStart ?? '07:30',
          workingHoursEnd: data.working_hours_end ?? data.workingHoursEnd ?? '20:00'
        } });
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
      .select('*, profiles(name), cliente_tags(tags(name, color))')
      .neq('status', 'SYSTEM')
      .or(`attendant_id.eq.${userId},attendant_id.is.null`);
      
    if (error) {
      console.error("Error fetching clients:", error);
      return;
    }

    const { data: instancesData } = await supabase.from('whatsapp_instances').select('instance_name, phone_number');
    const instancesMap = new Map(instancesData?.map(i => [i.instance_name, i.phone_number]) || []);

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
      is_exported: c.is_exported || false,
      connected_instance: c.connected_instance || undefined,
      connected_instance_phone: c.connected_instance ? instancesMap.get(c.connected_instance) : undefined,
      messages: [],
      history: [],
      hasUnreadMessages: c.has_unread_messages || false,
      has_unread_messages: c.has_unread_messages || false,
      last_message_at: c.last_message_at || c.updated_at,
    }));

    formattedClients.sort((a, b) => {
      const lastMsgA = new Date(a.last_message_at || 0).getTime();
      const lastMsgB = new Date(b.last_message_at || 0).getTime();
      return lastMsgB - lastMsgA; 
    });

    set({ clients: formattedClients });
  },

  markClientsAsExported: async (clientIds: string[]) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        clientIds.includes(c.id) ? { ...c, is_exported: true } : c
      ),
    }));

    const { error } = await supabase
      .from('clientes')
      .update({ is_exported: true })
      .in('id', clientIds);

    if (error) console.error("Error marking clients as exported:", error);
  },

  fetchAdminClients: async (password: string) => {
    try {
      const response = await fetch(`/api/admin/clients?pwd=${password}&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return false;
      
      const { clients } = await response.json();

      const { data: instancesData } = await supabase.from('whatsapp_instances').select('instance_name, phone_number');
      const instancesMap = new Map(instancesData?.map(i => [i.instance_name, i.phone_number]) || []);

      const enhancedClients = clients.map((c: any) => ({
        ...c,
        connected_instance_phone: c.connected_instance ? instancesMap.get(c.connected_instance) : undefined,
        hasUnreadMessages: c.has_unread_messages || false,
        has_unread_messages: c.has_unread_messages || false,
        last_message_at: c.last_message_at || c.updated_at,
      }));

      set({ clients: enhancedClients });
      return true;
    } catch (error) {
      console.error("Erro ao buscar clientes admin:", error);
      return false;
    }
  },

  fetchClientMessages: async (clientId: string) => {
    const { data, error } = await supabase
      .from('mensagens')
      .select('*')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error("Error fetching messages for client:", error);
      return;
    }

    const formattedMessages = data.map(m => ({
      id: m.id,
      text: m.text,
      sender: m.sender === 'client' ? 'client' : m.sender,
      timestamp: m.timestamp || new Date().toISOString(),
      read: m.read || true
    }));

    set(state => ({
      clients: state.clients.map(c => 
        c.id === clientId ? { ...c, messages: formattedMessages } : c
      )
    }));
  },

  markMessagesAsRead: async (clientId: string) => {
    // Atualiza localmente
    set((state) => ({
      clients: state.clients.map(c => 
        c.id === clientId ? { ...c, hasUnreadMessages: false, has_unread_messages: false } : c
      )
    }));
    // Atualiza no banco
    await supabase.from('clientes').update({ has_unread_messages: false }).eq('id', clientId);
  },

  updateClientStatus: async (clientId, newStatus) => {
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
        }
      } catch (err) {
        console.error("Erro na requisição para enviar mensagem:", err);
      }
    } else {
      const { error } = await supabase.from('mensagens').insert({
        client_id: clientId,
        text: message.text,
        sender: message.sender,
        read: true
      });
      if (error) console.error("Error adding message:", error);
    }
  },

  markMessagesAsRead: async (clientId: string) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId
          ? {
              ...c,
              messages: c.messages.map((m) => ({ ...m, read: true })),
              hasUnreadMessages: false,
              has_unread_messages: false
            }
          : c
      ),
    }));

    const { error } = await supabase
      .from('mensagens')
      .update({ read: true })
      .eq('client_id', clientId)
      .eq('sender', 'client')
      .eq('read', false);
      
    await supabase.from('clientes').update({ has_unread_messages: false }).eq('id', clientId);

    if (error) console.error("Error marking messages as read:", error);
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
        c.id === clientId ? { ...c, ai_enabled: enabled, ...(enabled ? { needs_human: false } : {}) } : c
      ),
    }));

    const updateData: any = { ai_enabled: enabled, updated_at: new Date().toISOString() };
    if (enabled) {
      updateData.needs_human = false;
    }

    const { error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', clientId);

    if (error) console.error("Error updating ai_enabled:", error);
  },

  toggleNeedsHuman: async (clientId: string, needsHuman: boolean) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, needs_human: needsHuman, ...(needsHuman ? {} : { ai_enabled: true }) } : c
      ),
    }));

    const updateData: any = { needs_human: needsHuman, updated_at: new Date().toISOString() };
    if (!needsHuman) {
      updateData.ai_enabled = true;
    }

    const { error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', clientId);

    if (error) console.error("Error updating needs_human:", error);
  },
}));
