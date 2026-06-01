'use client';

import { Client } from '@/types';
import { Phone, Mail, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
    // Optional: make it look slightly transparent while dragging
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

  const hasUnreadMessages = client.messages.some(m => !m.read);
  let timeAgo = '';
  if (client.history[0]?.date) {
    const d = new Date(client.history[0].date);
    if (!isNaN(d.getTime())) {
      timeAgo = formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
    }
  }

  return (
    <div 
      className="glass-card p-4 relative group"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      {/* Automations Badge */}
      {settings.autoReplyEnabled && (
        <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-primary-hover opacity-0 group-hover:opacity-100 transition-opacity">
          Auto Ativo
        </div>
      )}
      
      {/* Unread indicator */}
      {hasUnreadMessages && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      )}

      <div className="flex items-start space-x-3 mb-3">
        {client.avatarUrl ? (
          <img src={client.avatarUrl} alt={client.name} className="w-10 h-10 rounded-full border border-surface-border object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-hover border border-surface-border flex items-center justify-center text-gray-400 font-medium">
            {client.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate pr-4">{client.name}</h4>
          <p className="text-xs text-gray-400 truncate flex items-center mt-0.5">
            <User className="w-3 h-3 mr-1" />
            {client.attendant}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center text-xs text-gray-300">
          <Phone className="w-3 h-3 mr-2 text-gray-500" />
          <span className="truncate">{client.phone}</span>
        </div>
        <div className="flex items-center text-xs text-gray-300">
          <Mail className="w-3 h-3 mr-2 text-gray-500" />
          <span className="truncate">{client.email}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(client.tags || []).slice(0, 2).map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-gray-300 border border-surface-border">
            {tag}
          </span>
        ))}
        {(client.tags || []).length > 2 && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-gray-400 border border-surface-border">
            +{(client.tags || []).length - 2}
          </span>
        )}
      </div>

      <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {timeAgo}
        </div>
      </div>
    </div>
  );
}
