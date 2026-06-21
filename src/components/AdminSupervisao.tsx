'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { Client } from '@/types';
import { Send, FileText, Search, User, Phone, CheckCircle2, AlertCircle, RefreshCw, X, Bot, MessageCircle } from 'lucide-react';
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedClient) return;
    addMessage(selectedClient.id, { text: newMessage, sender: 'attendant' });
    setNewMessage('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-background w-full h-full animate-in fade-in duration-200">
      
      {/* Coluna Esquerda: Lista de Leads */}
      <div className="w-[400px] border-r border-surface-border bg-surface flex flex-col h-full flex-shrink-0">
        
        {/* Header Esquerdo */}
        <div className="p-4 bg-surface-hover border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Supervisão de Chats</h2>
            <span className="text-xs text-gray-400">Total: {filteredClients.length} leads</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-border rounded-full text-gray-400 hover:text-white transition-colors border border-surface-border"
            title="Sair da Supervisão"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b border-surface-border space-y-3 bg-surface/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar lead ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-surface-border text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={attendantFilter}
              onChange={(e) => setAttendantFilter(e.target.value)}
              className="flex-1 bg-background border border-surface-border text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-primary"
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
              className="flex-1 bg-background border border-surface-border text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="Novo">Novo</option>
              <option value="Contato Feito">Contato Feito</option>
              <option value="Em Qualificação">Em Qualificação</option>
              <option value="Proposta Enviada">Proposta Enviada</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredClients.map(client => {
            const lastMessage = client.messages?.[client.messages.length - 1];
            return (
              <div 
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={clsx(
                  "p-4 border-b border-surface-border cursor-pointer hover:bg-surface-hover transition-colors",
                  selectedClientId === client.id ? "bg-surface-hover border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-white truncate max-w-[200px]">{client?.name || 'Desconhecido'}</h3>
                  {lastMessage && (
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {safeFormatDate(lastMessage.timestamp, "HH:mm")}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-400 mb-2">
                  <User className="w-3 h-3 mr-1" />
                  <span className="truncate">{client.attendant || 'Nenhum'}</span>
                  <span className="mx-2">•</span>
                  <span className={clsx("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold", 
                    client.status === 'Novo' ? 'bg-blue-500/20 text-blue-400' :
                    client.status === 'Finalizado' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {client.status}
                  </span>
                </div>
                {lastMessage && (
                  <p className="text-xs text-gray-400 truncate flex items-center">
                    {lastMessage.sender === 'system' ? <AlertCircle className="w-3 h-3 mr-1" /> :
                     lastMessage.sender === 'attendant' ? <CheckCircle2 className="w-3 h-3 mr-1 text-primary" /> : null}
                    {lastMessage.text || (lastMessage.media_url ? '📷 Arquivo de Mídia' : '')}
                  </p>
                )}
              </div>
            );
          })}
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Nenhum lead encontrado com estes filtros.
            </div>
          )}
        </div>
      </div>

      {/* Coluna Direita: Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative">
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-[#202c33] border-b border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center space-x-4">
                {selectedClient?.avatarUrl ? (
                  <img src={selectedClient.avatarUrl} alt={selectedClient?.name || ''} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-gray-400 font-bold">
                    {(selectedClient?.name || '?').charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-white font-semibold">{selectedClient?.name || 'Desconhecido'}</h2>
                  <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {selectedClient?.phone || ''}</span>
                    <span className="flex items-center"><User className="w-3 h-3 mr-1" /> Vendedor: <span className="font-semibold text-white ml-1">{selectedClient?.attendant || 'Sem Atendente'}</span></span>
                    {selectedClient?.needs_human && (
                      <span className="flex items-center text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded"><AlertCircle className="w-3 h-3 mr-1" /> Aguardando Humano</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative">
              <div className="absolute inset-0" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(11, 20, 26, 0.9)', zIndex: 0 }}></div>
              
              <div className="relative z-10 space-y-4 pb-4">
                {selectedClient.messages?.map((msg) => {
                  const isSystem = msg.sender === 'system';
                  const isAttendant = msg.sender === 'attendant';
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-4">
                        <div className="bg-[#1e2a30] text-gray-300 text-xs px-4 py-2 rounded-lg border border-white/10 shadow-sm text-center max-w-[80%] whitespace-pre-wrap">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={clsx("flex", isAttendant ? "justify-end" : "justify-start")}>
                      <div className={clsx(
                        "max-w-[70%] rounded-xl px-4 py-2 relative shadow-sm flex flex-col",
                        isAttendant ? "bg-[#005c4b] text-white rounded-tr-none" : "bg-[#202c33] text-white rounded-tl-none"
                      )}>
                        <span className={clsx(
                          "text-[11px] font-bold mb-1",
                          isAttendant ? "text-[#4ade80]" : "text-[#60a5fa]"
                        )}>
                          {isAttendant ? (selectedClient.attendant || 'Admin/Vendedor') : (selectedClient.name || 'Cliente')}
                        </span>
                        {msg.media_url ? (
                          <div className="flex flex-col gap-2">
                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
                              <FileText className="w-5 h-5 text-blue-300" />
                              <span className="text-sm text-blue-300 underline font-medium truncate">Ver Anexo</span>
                            </a>
                            {msg.text && <p className="text-sm">{msg.text}</p>}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        )}
                        <span className="text-[10px] text-white/60 self-end mt-1 flex items-center gap-1">
                          {safeFormatDate(msg.timestamp, "HH:mm")}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-[#202c33] border-t border-white/10 flex items-center space-x-3 z-10">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
                placeholder={`Enviar mensagem como ${selectedClient.attendant || 'Vendedor'}...`}
                className="flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-3 focus:outline-none placeholder-gray-400"
              />
              <button 
                onClick={handleSendMessage} 
                onMouseDown={(e) => e.preventDefault()} 
                className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-colors"
                title="Enviar como Vendedor"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 relative">
             <div className="absolute inset-0" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(11, 20, 26, 0.95)', zIndex: -1 }}></div>
            <div className="w-24 h-24 rounded-full bg-[#202c33] flex items-center justify-center mb-6 shadow-xl">
              <MessageCircle className="w-12 h-12 text-[#00a884]" />
            </div>
            <h2 className="text-3xl font-light text-white mb-4">Supervisão de Chats</h2>
            <p className="text-gray-400 max-w-md text-lg">
              Selecione um lead na lista à esquerda para visualizar e intervir na conversa em tempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
