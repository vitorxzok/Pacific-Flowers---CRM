'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, Send, User, Clock, Check, CheckCheck, Loader2 } from 'lucide-react';
import { ClientModal } from '@/components/ClientModal';

export default function ChatsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendants, setAttendants] = useState<any[]>([]);
  const [selectedAttendantId, setSelectedAttendantId] = useState<string>('ALL');

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setSession(session);
      if (session.user.user_metadata?.role !== 'admin') {
        router.push('/');
        return;
      }
      setIsAdmin(true);

      // Buscar lista de atendentes
      const { data: profiles } = await supabase.from('profiles').select('id, name');
      if (profiles) setAttendants(profiles);
    };
    fetchSession();
  }, [router, supabase]);

  useEffect(() => {
    if (!session) return;
    
    const fetchClients = async () => {
      try {
        let query = supabase
          .from('clientes')
          .select('*, mensagens(sender, read)')
          .order('updated_at', { ascending: false });

        // Apply attendant filter
        if (selectedAttendantId === 'null') {
          query = query.is('attendant_id', null);
        } else if (selectedAttendantId !== 'ALL') {
          query = query.eq('attendant_id', selectedAttendantId);
        }

        const { data, error } = await query;
        if (error) throw error;
        const formattedClients = data?.map((c: any) => ({
          ...c,
          hasUnreadMessages: c.mensagens ? c.mensagens.some((m: any) => m.sender === 'client' && m.read === false) : false
        })) || [];
        setClients(formattedClients);
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    // Subscribe to new clients or updates
    const subscription = supabase
      .channel('clientes_changes_chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session, isAdmin, selectedAttendantId, supabase]);



  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar / Client List */}
      <div className={`w-full md:w-[380px] flex-shrink-0 border-r border-surface-border bg-surface flex flex-col ${selectedClient ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-16 border-b border-surface-border flex items-center px-4 bg-surface/50">
          <h1 className="text-xl font-bold text-white">Chats</h1>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-surface-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Pesquisar conversa" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-surface-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex flex-col">
            <select
              value={selectedAttendantId}
              onChange={(e) => setSelectedAttendantId(e.target.value)}
              className="bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            >
              <option value="ALL">Todos os Vendedores/Números</option>
              {attendants.map(a => (
                <option key={a.id} value={a.id}>{a.name} (Vendedor)</option>
              ))}
              <option value="null">Robô (Sem vendedor atribuído)</option>
            </select>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            filteredClients.map(client => (
              <div 
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`flex items-center p-3 cursor-pointer transition-colors border-b border-surface-border/30 ${
                  selectedClient?.id === client.id 
                    ? 'bg-white/10' 
                    : client.hasUnreadMessages 
                      ? 'bg-red-500/20 hover:bg-red-500/30 animate-pulse' 
                      : 'hover:bg-white/5'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium truncate">{client.name || client.phone}</h3>
                    <span className="text-xs text-white/40">
                      {new Date(client.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-400 truncate">
                      {client.needs_human ? <span className="text-yellow-500 text-xs mr-1 font-medium">⚠️ Aguardando</span> : ''}
                      {client.phone}
                    </p>
                    {isAdmin && (
                       <span className="text-[10px] bg-surface-border px-2 py-0.5 rounded text-gray-300 ml-2 truncate max-w-[120px]">
                         {client.attendant_id ? `Vendedor: ${attendants.find(a => a.id === client.attendant_id)?.name || 'Desconhecido'}` : 'Robô'}
                       </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area (Empty State - Modal handles the actual chat) */}
      <div className={`flex-1 flex flex-col bg-[#0b141a] ${!selectedClient ? 'hidden md:flex' : 'flex'} items-center justify-center text-gray-400 space-y-4`}>
        <div className="w-64 h-64 opacity-20">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <h2 className="text-2xl font-light">Pacific Flowers Web</h2>
        <p className="text-sm">Selecione um chat para ver os detalhes e histórico</p>
      </div>

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
