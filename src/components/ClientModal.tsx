'use client';

import { useState, useRef, useEffect } from 'react';
import { Client } from '@/types';
import { X, MessageCircle, Clock, FileText, Send, User, Phone, Trash2 } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';

function safeFormatDate(dateStr: string | undefined, formatStr: string, options?: any) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr, options) : '';
}

interface ClientModalProps {
  client: Client;
  onClose: () => void;
}

type TabType = 'chat' | 'history' | 'data';

export function ClientModal({ client, onClose }: ClientModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [notes, setNotes] = useState(client.notes || '');
  const [tagsStr, setTagsStr] = useState((client.tags || []).join(', '));
  const { addMessage, updateClientNotes, updateClientTags, deleteClient } = useCRMStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [client.messages, activeTab]);

  const handleDeleteClient = async () => {
    if (confirm('Tem certeza que deseja excluir este lead e todas as suas mensagens? Esta ação não pode ser desfeita.')) {
      await deleteClient(client.id);
      onClose();
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    addMessage(client.id, { text: newMessage, sender: 'attendant' });
    setNewMessage('');
  };

  const handleSaveData = () => {
    updateClientNotes(client.id, notes);
    updateClientTags(client.id, tagsStr.split(',').map(t => t.trim()).filter(Boolean));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border bg-surface/50">
          <div className="flex items-center space-x-4">
            {client.avatarUrl ? (
              <img src={client.avatarUrl} alt={client.name} className="w-16 h-16 rounded-full border-2 border-surface-border object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-hover border-2 border-surface-border flex items-center justify-center text-xl text-gray-400 font-bold">
                {client.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{client.name}</h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                <span className="flex items-center"><Phone className="w-4 h-4 mr-1" /> {client.phone}</span>
                <span className="flex items-center"><User className="w-4 h-4 mr-1" /> {client.attendant}</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-hover border border-surface-border text-gray-300">
                  {client.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Toggle IA */}
            <div className="flex items-center space-x-2 bg-surface-hover px-3 py-1.5 rounded-lg border border-surface-border">
              <span className="text-xs font-semibold text-gray-300">
                IA {client.ai_enabled ? 'Ativada' : 'Desativada'}
              </span>
              <button
                onClick={() => useCRMStore.getState().updateClientAIEnabled(client.id, !client.ai_enabled)}
                className={clsx(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  client.ai_enabled ? 'bg-primary' : 'bg-gray-600'
                )}
              >
                <span
                  className={clsx(
                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                    client.ai_enabled ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
            
            <button onClick={handleDeleteClient} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Excluir Lead">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-surface-border px-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={clsx("flex items-center space-x-2 px-6 py-4 border-b-2 font-medium transition-colors", activeTab === 'chat' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600")}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Conversa</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={clsx("flex items-center space-x-2 px-6 py-4 border-b-2 font-medium transition-colors", activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600")}
          >
            <Clock className="w-4 h-4" />
            <span>Histórico</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={clsx("flex items-center space-x-2 px-6 py-4 border-b-2 font-medium transition-colors", activeTab === 'data' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600")}
          >
            <FileText className="w-4 h-4" />
            <span>Dados</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-[#0b141a]"> {/* WhatsApp dark mode base background */}
          
          {/* Aba Chat */}
          {activeTab === 'chat' && (
            <div className="absolute inset-0 flex flex-col" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(11, 20, 26, 0.9)' }}>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {client.messages.map((msg) => {
                  const isAttendant = msg.sender === 'attendant';
                  return (
                    <div key={msg.id} className={clsx("flex", isAttendant ? "justify-end" : "justify-start")}>
                      <div className={clsx(
                        "max-w-[70%] rounded-xl px-4 py-2 relative shadow-sm",
                        isAttendant ? "bg-[#005c4b] text-white rounded-tr-none" : "bg-[#202c33] text-white rounded-tl-none"
                      )}>
                        <p className="text-sm">{msg.text}</p>
                        <span className="text-[10px] text-white/60 float-right mt-1 ml-4">
                          {safeFormatDate(msg.timestamp, "HH:mm")}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-[#202c33] border-t border-white/10 flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
                  placeholder="Mensagem..."
                  className="flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-3 focus:outline-none placeholder-gray-400"
                />
                <button onClick={handleSendMessage} className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-colors">
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* Aba Histórico */}
          {activeTab === 'history' && (
            <div className="absolute inset-0 overflow-y-auto p-8 bg-background custom-scrollbar">
              <div className="max-w-2xl mx-auto space-y-6">
                {client.history.map((event, index) => (
                  <div key={event.id} className="relative pl-8 pb-6 border-l-2 border-surface-border last:border-0 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                    <div className="glass-panel p-4 -mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white capitalize">
                          {event.type === 'status_change' ? 'Mudança de Status' : event.type === 'creation' ? 'Criação do Contato' : 'Nota'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {safeFormatDate(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aba Dados */}
          {activeTab === 'data' && (
            <div className="absolute inset-0 overflow-y-auto p-8 bg-background custom-scrollbar">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="glass-panel p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags (separadas por vírgula)</label>
                    <input
                      type="text"
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Ex: Alta Prioridade, B2B, Suporte"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                      className="w-full bg-surface border border-surface-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Insira as anotações sobre o cliente aqui..."
                    />
                  </div>
                  
                  {(client.status.toLowerCase().includes('finalizado') || client.status.toLowerCase().includes('reposição')) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Data Programada para Reposição</label>
                      <input
                        type="date"
                        value={client.custom_reposicao_date ? client.custom_reposicao_date.split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value;
                          useCRMStore.getState().updateClientReposicaoDate(client.id, date ? new Date(date).toISOString() : null);
                        }}
                        className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Se deixado em branco, usará a regra global configurada (Data da Compra + Dias padrão).
                      </p>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveData} className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg">
                      Salvar Dados
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
