'use client';

import { Search, Bot } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';
import { KanbanBoard } from '@/components/KanbanBoard';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function Home() {
  const { searchQuery, setSearchQuery, settings, setSettings, fetchClients, fetchSettings } = useCRMStore();
  const [mounted, setMounted] = useState(false);
  const [localName, setLocalName] = useState('');

  // Evitar hydration mismatch com Zustand persist e carregar dados
  useEffect(() => {
    setMounted(true);
    fetchClients();
    fetchSettings();
  }, [fetchClients, fetchSettings]);

  useEffect(() => {
    if (settings.businessName !== undefined) {
      setLocalName(settings.businessName);
    }
  }, [settings.businessName]);

  // Subscrição Supabase Realtime para atualizar o Kanban e o Chat instantaneamente
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('kanban_realtime_main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        async () => {
          console.log('Cliente atualizado, recarregando Kanban...');
          await fetchClients();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensagens' },
        async () => {
          console.log('Nova mensagem, recarregando chat...');
          await fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  if (!mounted) return <div className="p-8 flex-1 flex items-center justify-center text-gray-500">Carregando painel...</div>;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header & Filter */}
      <header className="px-8 py-6 border-b border-surface-border flex flex-col gap-4 bg-surface/50 backdrop-blur-md z-10 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Painel de Atendimento</h1>
            <p className="text-sm text-gray-400">Gerencie seus contatos e clientes</p>
          </div>

          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail, telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 bg-surface border border-surface-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Quick Settings Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-2 pt-4 border-t border-surface-border/50">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-300">Operador (IA):</label>
            <input 
              type="text" 
              placeholder="Ex: Carlos"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={() => {
                if (localName !== settings.businessName) {
                  setSettings({ businessName: localName });
                  toast.success('Nome do operador salvo automaticamente!');
                }
              }}
              className="w-40 bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-300">Atendimento Automático:</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.autoReplyEnabled}
                onChange={(e) => {
                  setSettings({ autoReplyEnabled: e.target.checked });
                  toast.success(e.target.checked ? 'Automação Ativada!' : 'Automação Desativada!');
                }}
              />
              <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
            {settings.autoReplyEnabled && (
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Bot className="w-4 h-4" /> Ativa
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide p-8 relative">
        <KanbanBoard />
      </div>
    </div>
  );
}
