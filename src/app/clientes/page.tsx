'use client';

import { useState, useEffect } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { Search, User, Phone, Calendar, ArrowLeft, ArrowRight, Filter } from 'lucide-react';
import { ClientModal } from '@/components/ClientModal';
import { Client } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientesPage() {
  const { clients, fetchClients } = useCRMStore();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const [newlyUpdatedIds, setNewlyUpdatedIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    setMounted(true);
    fetchClients();
  }, [fetchClients]);

  // Subscrição Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('table_clientes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        async (payload) => {
          console.log('Realtime update received:', payload);
          
          // Refresca os dados da store local para manter tudo sincronizado
          await fetchClients();

          const clientId = payload.new ? (payload.new as any).id : null;
          
          if (payload.eventType === 'INSERT' && clientId) {
            // Adiciona aos IDs recém-adicionados para piscar
            setNewlyAddedIds((prev) => {
              const next = new Set(prev);
              next.add(clientId);
              return next;
            });
            toast.success(`Novo cliente cadastrado em tempo real!`);
            // Limpa o piscar depois de 5 segundos
            setTimeout(() => {
              setNewlyAddedIds((prev) => {
                const next = new Set(prev);
                next.delete(clientId);
                return next;
              });
            }, 5000);
          } else if (payload.eventType === 'UPDATE' && clientId) {
            // Adiciona aos IDs recém-atualizados para piscar
            setNewlyUpdatedIds((prev) => {
              const next = new Set(prev);
              next.add(clientId);
              return next;
            });
            // Limpa o piscar depois de 3 segundos
            setTimeout(() => {
              setNewlyUpdatedIds((prev) => {
                const next = new Set(prev);
                next.delete(clientId);
                return next;
              });
            }, 3000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens' },
        async (payload) => {
          console.log('Nova mensagem recebida via realtime:', payload);
          // Refresca os dados da store local para atualizar o chat imediatamente
          await fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  if (!mounted) {
    return <div className="p-8 flex-1 flex items-center justify-center text-gray-500">Carregando clientes...</div>;
  }

  // Filtragem dos clientes baseada na busca
  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      client.phone.includes(term) ||
      client.email.toLowerCase().includes(term) ||
      client.status.toLowerCase().includes(term) ||
      client.attendant.toLowerCase().includes(term)
    );
  });

  // Paginação
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  // Formatar data de criação (ou assumir hoje se vazio)
  const formatCreationDate = (clientHistory: any[]) => {
    const creationEvent = clientHistory?.find(e => e.type === 'creation' || e.type === 'message');
    const dateStr = creationEvent?.date || new Date().toISOString();
    const date = new Date(dateStr);
    return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : '';
  };

  const formatLastMessageDate = (messages: any[]) => {
    if (!messages || messages.length === 0) return 'Sem mensagens';
    const maxTimestamp = Math.max(...messages.map(m => new Date(m.timestamp).getTime()));
    const date = new Date(maxTimestamp);
    return isValid(date) ? format(date, "dd/MM/yyyy HH:mm", { locale: ptBR }) : '';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Novo':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Contato Feito':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Em Qualificação':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Proposta':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Negociação':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'Finalizado':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'Perdido':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  // Se um cliente selecionado foi atualizado no store global (ex: por mudança de dados no modal),
  // atualiza a referência local do modal aberto para refletir as mudanças dinamicamente.
  const activeClientInModal = selectedClient 
    ? clients.find(c => c.id === selectedClient.id) || selectedClient 
    : null;

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12 bg-background relative flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-blue-700 flex items-center justify-center text-white shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Base de Clientes</h1>
              <p className="text-gray-400 mt-1">Exibição detalhada de todos os leads cadastrados e contatos no funil.</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, status ou atendente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-3 w-full bg-surface border border-surface-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-md animate-in fade-in"
            />
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="px-4 py-3 bg-surface border border-surface-border rounded-xl flex items-center space-x-2 text-sm text-gray-400 font-medium whitespace-nowrap shadow-md">
              <Filter className="w-4 h-4 text-gray-400" />
              <span>Total: {filteredClients.length} leads</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-panel overflow-hidden shadow-2xl flex-1 flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-surface-hover/20">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status Atual</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Última Mensagem</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {paginatedClients.length > 0 ? (
                  paginatedClients.map((client) => {
                    const isNew = newlyAddedIds.has(client.id);
                    const isUpdated = newlyUpdatedIds.has(client.id);

                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`hover:bg-surface-hover/50 cursor-pointer transition-all duration-300 ${
                          isNew 
                            ? 'bg-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.3)] animate-pulse' 
                            : isUpdated 
                              ? 'bg-blue-500/10 shadow-[inset_0_0_15px_rgba(59,130,246,0.2)]'
                              : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-white block text-sm">{client.name}</span>
                              <span className="text-xs text-gray-400">{client.email || 'Sem e-mail'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            <span>{client.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider inline-block text-center ${getStatusBadgeClass(client.status)}`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            <span>{formatLastMessageDate(client.messages)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            <span>{formatCreationDate(client.history)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Nenhum cliente encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-hover/10">
              <span className="text-sm text-gray-400">
                Página <span className="font-semibold text-white">{currentPage}</span> de <span className="font-semibold text-white">{totalPages}</span>
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-surface hover:bg-surface-hover border border-surface-border rounded-lg disabled:opacity-30 disabled:hover:bg-surface text-white transition-all shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-surface hover:bg-surface-hover border border-surface-border rounded-lg disabled:opacity-30 disabled:hover:bg-surface text-white transition-all shadow-md"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Detalhes do Cliente */}
        {activeClientInModal && (
          <ClientModal
            client={activeClientInModal}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </div>
    </div>
  );
}
