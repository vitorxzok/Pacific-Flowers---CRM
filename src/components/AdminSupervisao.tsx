'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { Client } from '@/types';
import { Send, FileText, Search, User, Phone, CheckCircle2, AlertCircle, RefreshCw, X, Bot, MessageCircle } from 'lucide-react';
import { ClientModal } from '@/components/ClientModal';
import { clsx } from 'clsx';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function safeFormatDate(dateStr: string | undefined, formatStr: string, options?: any) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr, options) : '';
}

interface AdminSupervisaoProps {
  onClose: () => void;
}

export function AdminSupervisao({ onClose }: AdminSupervisaoProps) {
  const { clients, addMessage } = useCRMStore();
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendantFilter, setAttendantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista de vendedores únicos
  const uniqueAttendants = useMemo(() => {
    const attendants = new Set<string>();
    clients.forEach(c => {
      if (c.attendant) attendants.add(c.attendant);
    });
    return Array.from(attendants).sort();
  }, [clients]);

  // Filtragem de Leads
  const filteredClients = useMemo(() => {
    return clients
      .filter(c => {
        const name = c.name || '';
        const phone = c.phone || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              phone.includes(searchTerm) ||
                              (c.storeName && c.storeName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesAttendant = attendantFilter === 'all' || c.attendant === attendantFilter;
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesAttendant && matchesStatus;
      })
      .sort((a, b) => {
        // Ordenar por última mensagem
        const lastA = a.messages && a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].timestamp).getTime() : 0;
        const lastB = b.messages && b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].timestamp).getTime() : 0;
        return lastB - lastA;
      });
  }, [clients, searchTerm, attendantFilter, statusFilter]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedClient) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedClient?.messages, selectedClientId]);

  const [isReactivating, setIsReactivating] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateDays, setReactivateDays] = useState('2');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedClient) return;
    addMessage(selectedClient.id, { text: newMessage, sender: 'attendant' });
    setNewMessage('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleReactivateLeads = async () => {
    try {
      setIsReactivating(true);
      const pwd = localStorage.getItem('crm_admin_pwd') || '';
      const response = await fetch('/api/admin/retroactive-cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pwd, daysAgo: parseInt(reactivateDays) }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Sucesso! ${data.reactivatedCount} leads reativados de um total de ${data.totalEvaluated} avaliados.`);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Erro na requisição: ${err.message}`);
    } finally {
      setIsReactivating(false);
      setShowReactivateModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-background w-full h-full animate-in fade-in duration-200">
      <div className="h-full w-full overflow-y-auto p-4 md:p-8 lg:p-12 relative flex flex-col custom-scrollbar">
        <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#00a884] to-emerald-700 flex items-center justify-center text-white shadow-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Supervisão de Chats</h1>
                <p className="text-gray-400 mt-1 text-sm">Supervisão de conversas de toda a equipe.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReactivateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#005c4b] text-white text-sm font-medium rounded-xl hover:bg-[#00705a] transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reativar Vácuo</span>
              </button>
              <button 
                onClick={onClose}
                className="p-2.5 hover:bg-surface-border rounded-xl text-gray-400 hover:text-white transition-colors border border-surface-border bg-surface"
                title="Sair da Supervisão"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, status ou atendente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-full bg-surface border border-surface-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00a884]/50 focus:border-[#00a884] transition-all shadow-md"
              />
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
              <select
                value={attendantFilter}
                onChange={(e) => setAttendantFilter(e.target.value)}
                className="w-full md:w-auto bg-surface border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00a884] shadow-md min-w-[200px]"
              >
                <option value="all">Todos os Vendedores</option>
                <option value="">Sem Vendedor</option>
                {uniqueAttendants.map(att => (
                  <option key={att} value={att}>{att}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto bg-surface border border-surface-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00a884] shadow-md min-w-[200px]"
              >
                <option value="all">Todos os Status</option>
                <option value="Novo">Novo</option>
                <option value="Contato Feito">Contato Feito</option>
                <option value="Em Qualificação">Em Qualificação</option>
                <option value="Proposta Enviada">Proposta Enviada</option>
                <option value="Finalizado">Finalizado</option>
              </select>
              <div className="px-4 py-3 bg-surface border border-surface-border rounded-xl flex items-center justify-center space-x-2 text-sm text-gray-400 font-medium whitespace-nowrap shadow-md w-full md:w-auto">
                <User className="w-4 h-4 text-gray-400" />
                <span>Total: {filteredClients.length}</span>
              </div>
            </div>
          </div>

          {/* Modal Reativar Vácuo */}
          {showReactivateModal && (
            <div className="bg-surface border border-surface-border p-5 rounded-xl shadow-lg">
              <h3 className="font-semibold text-white mb-2 text-lg">Reativar Vácuos</h3>
              <p className="text-sm text-gray-400 mb-4">Reativar leads que não respondem (sem vendedor atribuído) nos últimos X dias.</p>
              <div className="flex items-center gap-3">
                <select 
                  value={reactivateDays}
                  onChange={(e) => setReactivateDays(e.target.value)}
                  className="bg-background text-white text-sm rounded-lg border border-surface-border p-2 focus:outline-none focus:border-[#00a884]"
                >
                  <option value="2">2 dias</option>
                  <option value="5">5 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30">30 dias</option>
                </select>
                <button 
                  onClick={handleReactivateLeads}
                  disabled={isReactivating}
                  className="px-4 py-2 bg-[#00a884] text-white text-sm font-medium rounded-lg hover:bg-[#00a884]/90 disabled:opacity-50 transition-colors"
                >
                  {isReactivating ? 'Processando...' : 'Iniciar'}
                </button>
                <button 
                  onClick={() => setShowReactivateModal(false)}
                  className="px-4 py-2 bg-surface-border text-white text-sm font-medium rounded-lg hover:bg-surface-border/80 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabela de Dados */}
          <div className="glass-panel overflow-hidden shadow-2xl flex-1 flex flex-col justify-between bg-surface/30 border border-surface-border rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-hover/30">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Telefone</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status Atual</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vendedor</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Última Mensagem</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Criação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => {
                      const lastMessage = client.messages?.[client.messages.length - 1];
                      return (
                        <tr
                          key={client.id}
                          onClick={() => setSelectedClientId(client.id)}
                          className="hover:bg-surface-hover/50 cursor-pointer transition-all duration-300"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-[#00a884]/10 border border-[#00a884]/20 flex items-center justify-center text-[#00a884] font-bold text-sm">
                                {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm">{client.name || 'Desconhecido'}</span>
                                <span className="text-xs text-gray-400">{client.email || 'Sem e-mail'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-500" />
                              <span>{client.phone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={clsx("px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider inline-block text-center whitespace-nowrap", 
                              client.status === 'Novo' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                              client.status === 'Finalizado' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                              client.status === 'Contato Feito' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                              client.status === 'Em Qualificação' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                              client.status === 'Proposta Enviada' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/20'
                            )}>
                              {client.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1.5 text-sm text-gray-300">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                              <span className="font-medium text-gray-200 whitespace-nowrap">{client.attendant || 'Nenhum'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {lastMessage ? (
                              <div className="flex flex-col">
                                <span className="truncate max-w-[250px] text-gray-200" title={lastMessage.text || (lastMessage.media_url ? '📷 Arquivo de Mídia' : '')}>
                                  {lastMessage.text || (lastMessage.media_url ? '📷 Arquivo de Mídia' : '')}
                                </span>
                                <span className="text-[10px] text-gray-500 mt-0.5">
                                  {safeFormatDate(lastMessage.timestamp, 'dd/MM/yyyy HH:mm')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs italic">Nenhuma mensagem</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                            {safeFormatDate(client.purchaseDate || (client as any).created_at, 'dd/MM/yyyy HH:mm')}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nenhum cliente encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedClient && (
          <ClientModal
            client={selectedClient}
            onClose={() => setSelectedClientId(null)}
          />
        )}
      </div>
    </div>
  );
}
