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
  const { settings, updateClientStatus, removeKanbanColumn } = useCRMStore();
  const normalizedStatus = status.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fixedColumns = ['novo', 'contato feito', 'em qualificacao', 'proposta enviada', 'finalizado', 'reposicao', 'perdido'];
  const isFixed = fixedColumns.includes(normalizedStatus);

  const displayStatus = settings.kanbanColumnNames?.[status] || status;

  const getColor = (status: string) => {
    return statusColors[status] || 'bg-blue-500';
  };

  const handleDelete = () => {
    if (clients.length > 0) {
      toast.error('Mova os clientes antes de excluir a coluna.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir a coluna "${displayStatus}"?`)) {
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
          description: `${client.name} movido para ${displayStatus}.`
        });
      }
    }
  };

  return (
    <div 
      className="flex flex-col w-[320px] flex-shrink-0 bg-surface/50 border border-surface-border rounded-xl h-full backdrop-blur-md overflow-hidden transition-all duration-300"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-surface-border/50 flex items-center justify-between bg-surface-hover/30">
        <div className="flex items-center space-x-3">
          <div className={clsx("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", getColor(status))} />
          <h2 className="font-semibold text-white/90 text-sm uppercase tracking-wider">{displayStatus}</h2>
          <span className="bg-surface border border-surface-border text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium">
            {clients.length}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {!isFixed && (
            <button 
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Excluir Coluna"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
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
