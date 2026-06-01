'use client';

import { ClientStatus, Client } from '@/types';
import { KanbanCard } from './KanbanCard';
import { useCRMStore } from '@/store/useCRMStore';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Trash2 } from 'lucide-react';

interface KanbanColumnProps {
  status: ClientStatus;
  clients: Client[];
  onCardClick: (client: Client) => void;
}

const statusColors: Record<string, string> = {
  'Novo': 'bg-status-new',
  'Contato Feito': 'bg-status-waiting',
  'Em Qualificação': 'bg-status-qualifying',
  'Proposta': 'bg-status-attending',
  'Negociação': 'bg-status-attending',
  'Finalizado': 'bg-status-finished',
  'Perdido': 'bg-status-lost',
};

export function KanbanColumn({ status, clients, onCardClick }: KanbanColumnProps) {
  const { updateClientStatus, removeKanbanColumn } = useCRMStore();
  const isFixed = ['Novo', 'Contato Feito', 'Em Qualificação'].includes(status);

  const getColor = (status: string) => {
    return statusColors[status] || 'bg-blue-500';
  };

  const handleDelete = () => {
    if (clients.length > 0) {
      toast.error('Mova os clientes antes de excluir a coluna.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir a coluna "${status}"?`)) {
      removeKanbanColumn(status);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus') as ClientStatus;
    
    if (clientId && sourceStatus !== status) {
      updateClientStatus(clientId, status);
      const client = useCRMStore.getState().clients.find(c => c.id === clientId);
      if (client) {
        toast.success(`Cartão movido!`, {
          description: `${client.name} movido para ${status}.`
        });
      }
    }
  };

  return (
    <div 
      className="flex-shrink-0 w-[320px] flex flex-col h-full bg-surface/30 backdrop-blur-sm rounded-xl border border-surface-border/50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-surface-border/50 flex items-center justify-between group">
        <div className="flex items-center space-x-2">
          <div className={twMerge(clsx("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", getColor(status)))} />
          <h3 className="font-semibold text-white/90">{status}</h3>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-surface px-2 py-0.5 rounded-full text-xs font-medium text-gray-400 border border-surface-border">
            {clients.length}
          </span>
          {!isFixed && (
            <button 
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Excluir Coluna"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-3">
        {clients.map(client => (
          <KanbanCard 
            key={client.id} 
            client={client} 
            onClick={() => onCardClick(client)} 
          />
        ))}
      </div>
    </div>
  );
}
