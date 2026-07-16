'use client';

import { Client } from '@/types';
import { Phone, User, Clock, Store, DollarSign, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCRMStore } from '@/store/useCRMStore';

interface KanbanCardProps {
  client: Client;
  onClick: () => void;
}

export function KanbanCard({ client, onClick }: KanbanCardProps) {
  const { settings, toggleNeedsHuman } = useCRMStore();
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('clientId', client.id);
    e.dataTransfer.setData('sourceStatus', client.status);
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const hasUnreadMessages = client.hasUnreadMessages;
  
  let timeAgo = '';
  if (client.history?.[0]?.date) {
    const d = new Date(client.history[0].date);
    if (!isNaN(d.getTime())) {
      timeAgo = formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return format(d, 'dd/MM/yyyy');
  };

  const isAIActive = settings.autoReplyEnabled && client.ai_enabled !== false && !client.needs_human;
  
  let cardBorderClass = "";
  if (client.hasUnreadMessages) {
    cardBorderClass = "border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse";
  } else if (client.needs_human) {
    cardBorderClass = "border border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)] animate-pulse";
  } else if (isAIActive) {
    cardBorderClass = "border border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.2)]";
  }

  return (
    <div 
      className={`glass-card p-3 relative group transition-all hover:border-primary/50 cursor-pointer flex flex-col gap-2 ${cardBorderClass}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      {/* Automations Badge (Human Needed or AI Active) */}
      {client.needs_human ? (
        <div 
          onClick={(e) => { e.stopPropagation(); toggleNeedsHuman(client.id, false); }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-600 cursor-pointer transition-colors text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10 whitespace-nowrap animate-pulse border border-green-400"
          title="Clique para retornar atendimento à IA"
        >
          AGUARDANDO VENDEDOR
        </div>
      ) : isAIActive ? (
        <div 
          onClick={(e) => { e.stopPropagation(); toggleNeedsHuman(client.id, true); }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10 whitespace-nowrap border border-yellow-400"
          title="Clique para pausar IA e assumir o atendimento"
        >
          IA ATENDENDO
        </div>
      ) : (
        <div 
          onClick={(e) => { e.stopPropagation(); toggleNeedsHuman(client.id, false); }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 cursor-pointer transition-colors text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10 whitespace-nowrap border border-blue-400"
          title="Atendimento manual. Clique para ativar a IA novamente"
        >
          ATENDIMENTO HUMANO
        </div>
      )}
      
      {/* Unread indicator */}
      {hasUnreadMessages && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      )}

      {/* Identificação Principal (Loja e Cliente) */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          {client.storeName ? (
            <>
              <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-primary" />
                {client.storeName}
              </h4>
              <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3 text-gray-500" />
                {client.name}
              </p>
            </>
          ) : (
            <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              {client.name}
            </h4>
          )}
        </div>
      </div>

      {/* Contato Básicos */}
      <div className="flex flex-col gap-1 mt-0.5">
        <div className="flex items-center text-[11px] text-gray-300 gap-2">
          <div className="flex items-center">
            <Phone className="w-3 h-3 mr-1.5 text-gray-500" />
            <span className="truncate">{client.phone}</span>
          </div>
          {client.connected_instance && (
            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-[4px] text-[9px] font-bold" title={`Instância: ${client.connected_instance}`}>
              WhatsApp: {(client as any).connected_instance_phone || `Slot ${client.connected_instance.split('_').pop()}`}
            </span>
          )}
        </div>
      </div>

      {/* Valores e Data (Compra) - Glassmorphism Highlight */}
      {(client.purchaseValue !== undefined || client.purchaseDate) && (
        <div className="mt-1 bg-surface-hover/50 border border-surface-border rounded p-1.5 flex flex-wrap items-center justify-between gap-2">
          {client.purchaseValue !== undefined && (
            <div className="flex items-center text-xs font-semibold text-emerald-400">
              <DollarSign className="w-3 h-3 mr-0.5" />
              {formatCurrency(client.purchaseValue)}
            </div>
          )}
          {client.purchaseDate && (
            <div className="flex items-center text-[10px] text-gray-400">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(client.purchaseDate)}
            </div>
          )}
        </div>
      )}

      {/* Tags e Tempo */}
      <div className="pt-2 mt-auto border-t border-surface-border/50 flex flex-wrap items-center justify-between gap-1">
        <div className="flex flex-wrap gap-1">
          {(client.tags || []).slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface/50 text-gray-300 border border-surface-border">
              {tag}
            </span>
          ))}
          {(client.tags || []).length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface/50 text-gray-400 border border-surface-border">
              +{(client.tags || []).length - 2}
            </span>
          )}
        </div>
        
        {timeAgo && (
          <div className="flex items-center text-[10px] text-gray-500 ml-auto whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 mr-1" />
            {timeAgo}
          </div>
        )}
      </div>
    </div>
  );
}

