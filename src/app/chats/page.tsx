'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, Send, User, Clock, Check, CheckCheck, Loader2 } from 'lucide-react';

export default function ChatsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setSession(session);
      setIsAdmin(session.user.user_metadata?.role === 'admin');
    };
    fetchSession();
  }, [router, supabase]);

  useEffect(() => {
    if (!session) return;
    
    const fetchClients = async () => {
      try {
        let query = supabase
          .from('clientes')
          .select('*')
          .order('updated_at', { ascending: false });

        // If not admin, only show clients assigned to this user
        if (!isAdmin) {
          query = query.eq('attendant_id', session.user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setClients(data || []);
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
  }, [session, isAdmin, supabase]);

  useEffect(() => {
    if (!selectedClient) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('timestamp', { ascending: true });

      if (!error && data) {
        setMessages(data);
        scrollToBottom();
      }
    };

    fetchMessages();

    // Subscribe to new messages for this client
    const subscription = supabase
      .channel(`mensagens_changes_${selectedClient.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `client_id=eq.${selectedClient.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedClient, supabase]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedClient || sending) return;

    setSending(true);
    try {
      // Optistic UI update
      const tempMsg = {
        id: 'temp-' + Date.now(),
        client_id: selectedClient.id,
        sender: 'attendant',
        text: newMessage,
        timestamp: new Date().toISOString(),
        read: false
      };
      setMessages(prev => [...prev, tempMsg]);
      setNewMessage('');
      scrollToBottom();

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          text: tempMsg.text
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }
      
      // Update needs_human to false since human replied
      await supabase.from('clientes').update({ needs_human: false }).eq('id', selectedClient.id);

    } catch (err) {
      console.error('Error sending message:', err);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

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
        <div className="p-3 border-b border-surface-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Pesquisar ou começar uma nova conversa" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-surface-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            />
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
                className={`flex items-center p-3 cursor-pointer hover:bg-white/5 border-b border-surface-border/30 transition-colors ${selectedClient?.id === client.id ? 'bg-white/10' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium truncate">{client.name || client.phone}</h3>
                    <span className="text-xs text-gray-400">
                      {new Date(client.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-400 truncate">
                      {client.needs_human ? <span className="text-yellow-500 text-xs mr-1 font-medium">⚠️ Aguardando</span> : ''}
                      {client.phone}
                    </p>
                    {isAdmin && (
                       <span className="text-[10px] bg-surface-border px-2 py-0.5 rounded text-gray-300 ml-2 truncate max-w-[80px]">
                         {client.attendant_id ? 'Vendedor' : 'Robô'}
                       </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#0b141a] ${!selectedClient ? 'hidden md:flex' : 'flex'}`}>
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-surface-border/30 bg-[#202c33] flex items-center px-4 shrink-0">
              <button 
                className="mr-3 md:hidden text-gray-300"
                onClick={() => setSelectedClient(null)}
              >
                ← Voltar
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="ml-3">
                <h2 className="text-white font-medium">{selectedClient.name || selectedClient.phone}</h2>
                <p className="text-xs text-gray-400">{selectedClient.phone}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0b141a] bg-opacity-90 relative" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundRepeat: 'repeat', opacity: 0.9 }}>
              <div className="max-w-3xl mx-auto space-y-2">
                {messages.map((msg, idx) => {
                  const isMe = msg.sender === 'attendant';
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] rounded-lg px-3 py-2 relative shadow-sm text-sm ${
                          isMe ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-white rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        
                        {/* Media rendering could go here */}
                        {msg.media_url && (
                          <div className="mt-2">
                            {msg.media_type === 'image' || msg.media_url.match(/\.(jpeg|jpg|gif|png)$/) ? (
                              <img src={msg.media_url} alt="Media" className="rounded max-w-full max-h-60 object-cover" />
                            ) : msg.media_type === 'audio' || msg.media_url.match(/\.(ogg|mp3|wav)$/) ? (
                              <audio controls src={msg.media_url} className="max-w-[200px]" />
                            ) : (
                              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                📎 Documento
                              </a>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-white/60">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <span className="text-white/60">
                              {msg.read ? <CheckCheck className="w-3 h-3 text-[#53bdeb]" /> : <Check className="w-3 h-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="h-[60px] bg-[#202c33] px-4 py-2 shrink-0 flex items-center gap-2">
              <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mensagem"
                  className="flex-1 bg-[#2a3942] text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none"
                  disabled={sending}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="w-64 h-64 opacity-20">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </div>
            <h2 className="text-2xl font-light">Pacific Flowers Web</h2>
            <p className="text-sm">Selecione um chat para começar a conversar</p>
          </div>
        )}
      </div>
    </div>
  );
}
