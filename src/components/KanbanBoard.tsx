'use client';

import { useMemo, useState } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { ClientStatus, Client } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { ClientModal } from './ClientModal';

import { Plus } from 'lucide-react';

export function KanbanBoard() {
  const { clients, searchQuery, settings, addKanbanColumn } = useCRMStore();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const COLUMNS = settings.kanbanColumns || ['Novo', 'Contato Feito', 'Em Qualificação'];

  const handleAddColumn = () => {
    const name = window.prompt("Nome da nova coluna:");
    if (name && name.trim() !== '') {
      addKanbanColumn(name.trim());
    }
  };

  // Filtro Inteligente
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    const queryNumbersOnly = query.replace(/\D/g, ''); // Remove all non-digits

    return clients.filter((client) => {
      const nameMatch = (client.name || '').toLowerCase().includes(query);
      const emailMatch = (client.email || '').toLowerCase().includes(query);
      const attendantMatch = (client.attendant || '').toLowerCase().includes(query);
      
      const clientPhoneNumbersOnly = (client.phone || '').replace(/\D/g, '');
      const phoneMatch = queryNumbersOnly.length > 0 && clientPhoneNumbersOnly.includes(queryNumbersOnly);
      
      return nameMatch || emailMatch || attendantMatch || phoneMatch;
    });
  }, [clients, searchQuery]);

  return (
    <>
      <div className="flex space-x-4 sm:space-x-6 h-full items-start overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const columnClients = filteredClients.filter(
            (client) => client.status === status
          );
          
          return (
            <KanbanColumn 
              key={status} 
              status={status} 
              clients={columnClients}
              onCardClick={(client) => setSelectedClientId(client.id)}
            />
          );
        })}
        <button 
          onClick={handleAddColumn}
          className="flex-shrink-0 w-[280px] h-[60px] flex items-center justify-center space-x-2 border-2 border-dashed border-surface-border rounded-xl text-gray-400 hover:text-primary hover:border-primary/50 transition-colors bg-surface/30"
        >
          <Plus size={20} />
          <span className="font-medium">Adicionar Coluna</span>
        </button>
      </div>

      {selectedClient && (
        <ClientModal 
          client={selectedClient} 
          onClose={() => setSelectedClientId(null)} 
        />
      )}
    </>
  );
}
