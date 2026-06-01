'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Clock, UserPlus, ArrowRightLeft, FileText } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Evento {
  id: string;
  client_id: string;
  type: 'status_change' | 'note' | 'creation';
  description: string;
  from_status?: string;
  to_status?: string;
  date: string;
  clientes?: {
    name: string;
  };
}

export default function NotificacoesPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const fetchEventos = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, clientes(name)')
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEventos(data || []);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  // Realtime Supabase Subscription
  useEffect(() => {
    const channel = supabase
      .channel('table_eventos_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'eventos' },
        async (payload) => {
          console.log('Realtime event received:', payload);
          
          // Refetch para carregar o evento com o JOIN de clientes
          const { data, error } = await supabase
            .from('eventos')
            .select('*, clientes(name)')
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setEventos((prev) => [data, ...prev].slice(0, 50));
            
            const eventId = data.id;
            setNewlyAddedIds((prev) => {
              const next = new Set(prev);
              next.add(eventId);
              return next;
            });

            // Disparar toast informando do evento em tempo real
            let toastMessage = 'Nova atividade registrada no sistema';
            if (data.type === 'creation') {
              toastMessage = `Novo lead recebido: ${data.clientes?.name || 'Desconhecido'}`;
            } else if (data.type === 'status_change') {
              toastMessage = `Lead ${data.clientes?.name || 'Desconhecido'} movido para ${data.to_status}`;
            }
            toast.info(toastMessage, { icon: <Bell className="w-4 h-4 text-primary" /> });

            // Limpa o piscar depois de 5 segundos
            setTimeout(() => {
              setNewlyAddedIds((prev) => {
                const next = new Set(prev);
                next.delete(eventId);
                return next;
              });
            }, 5000);
          } else {
            // Fallback de refetch se falhar
            fetchEventos();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'creation':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserPlus className="w-5 h-5" />
          </div>
        );
      case 'status_change':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        );
      case 'note':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-gray-400">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const getEventDescription = (evento: Evento) => {
    const clientName = evento.clientes?.name || 'Cliente Desconhecido';
    
    switch (evento.type) {
      case 'creation':
        return (
          <span>
            Novo lead recebido no funil: <strong className="text-white font-semibold">{clientName}</strong>.
          </span>
        );
      case 'status_change':
        return (
          <span>
            O lead <strong className="text-white font-semibold">{clientName}</strong> foi movido para o status{' '}
            <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-xs text-primary font-bold">
              {evento.to_status}
            </span>
            {evento.from_status && (
              <span className="text-gray-500 text-xs ml-1.5">
                (estava em: {evento.from_status})
              </span>
            )}
          </span>
        );
      case 'note':
        return (
          <span>
            Nova observação adicionada no lead <strong className="text-white font-semibold">{clientName}</strong>:{' '}
            <span className="text-gray-300 italic">"{evento.description}"</span>
          </span>
        );
      default:
        return <span>{evento.description}</span>;
    }
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return isValid(date) 
      ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : '';
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12 bg-background relative flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-700 flex items-center justify-center text-white shadow-lg relative">
              <Bell className="w-6 h-6" />
              {newlyAddedIds.size > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-background animate-ping" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Notificações</h1>
              <p className="text-gray-400 mt-1">Acompanhe as interações e atualizações dos clientes em tempo real.</p>
            </div>
          </div>
        </div>

        {/* Feed List */}
        <div className="glass-panel p-6 md:p-8 shadow-2xl flex-1 flex flex-col space-y-6">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Carregando feed de eventos...</div>
          ) : eventos.length > 0 ? (
            <div className="divide-y divide-surface-border">
              {eventos.map((evento) => {
                const isNew = newlyAddedIds.has(evento.id);

                return (
                  <div
                    key={evento.id}
                    className={`py-5 first:pt-0 last:pb-0 flex items-start gap-4 transition-all duration-500 ${
                      isNew 
                        ? 'bg-primary/10 px-4 -mx-4 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-pulse'
                        : ''
                    }`}
                  >
                    {getEventIcon(evento.type)}
                    <div className="flex-1 space-y-1">
                      <div className="text-sm text-gray-300 leading-relaxed">
                        {getEventDescription(evento)}
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatEventDate(evento.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center text-gray-500 animate-in zoom-in">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nenhum evento registrado</h3>
                <p className="text-sm text-gray-500 mt-1">As novidades do funil e novos contatos aparecerão aqui.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
