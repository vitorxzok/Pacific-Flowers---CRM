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
  const { settings } = useCRMStore();
  
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

  const hasUnreadMessages = client.messages?.some(m => !m.read);
  
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

  return (
    <div 
      className="glass-card p-3 relative group transition-all hover:border-primary/50 cursor-pointer flex flex-col gap-2"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      {/* Automations Badge */}
      {settings.autoReplyEnabled && client.ai_enabled !== false && (
        <div className="absolute -top-2 -right-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg border border-primary-hover opacity-0 group-hover:opacity-100 transition-opacity z-10">
          Auto
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
        <div className="flex items-center text-[11px] text-gray-300">
          <Phone className="w-3 h-3 mr-1.5 text-gray-500" />
          <span className="truncate">{client.phone}</span>
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

