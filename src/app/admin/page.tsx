'use client';

import { useState, useEffect } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { Lock, Users, MessageCircle, DollarSign, LogOut } from 'lucide-react';
import { ClientModal } from '@/components/ClientModal';
import { toast } from 'sonner';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [attendantFilter, setAttendantFilter] = useState<string>('all');

  const { clients, fetchAdminClients } = useCRMStore();

  // Se a sessão for destruída ao recarregar a página, pedirá senha novamente (segurança simples e eficaz)
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await fetchAdminClients(password);
    
    if (success) {
      setIsAuthenticated(true);
      toast.success('Login bem sucedido!');
    } else {
      toast.error('Senha incorreta!');
    }
    
    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <form onSubmit={handleLogin} className="glass-panel p-8 rounded-2xl w-full max-w-md space-y-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Acesso Restrito</h1>
            <p className="text-sm text-gray-400">Área exclusiva para administradores</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Senha Mestra</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Filtering
  const uniqueAttendants = Array.from(new Set(clients.map(c => c.attendant).filter(Boolean))) as string[];
  const filteredClients = attendantFilter === 'all' 
    ? clients 
    : clients.filter(c => c.attendant === attendantFilter);

  // Dashboard calculations based on filtered clients
  const totalLeads = filteredClients.length;
  const inProgress = filteredClients.filter(c => !['Finalizado', 'Perdido'].includes(c.status)).length;
  const closed = filteredClients.filter(c => c.status === 'Finalizado').length;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <header className="px-8 py-6 border-b border-surface-border bg-surface/50 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Painel do Administrador</h1>
          <p className="text-sm text-gray-400 mt-1">Visão global de todos os vendedores e leads</p>
        </div>
        <button 
          onClick={() => { setIsAuthenticated(false); setPassword(''); }}
          className="flex items-center space-x-2 px-4 py-2 bg-surface border border-surface-border text-white rounded-lg hover:bg-surface-hover transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </header>

      <div className="p-8 space-y-8">
        
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total de Leads</p>
              <h3 className="text-2xl font-bold text-white">{totalLeads}</h3>
            </div>
          </div>
          <div className="glass-panel p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Em Atendimento</p>
              <h3 className="text-2xl font-bold text-white">{inProgress}</h3>
            </div>
          </div>
          <div className="glass-panel p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Negócios Fechados</p>
              <h3 className="text-2xl font-bold text-white">{closed}</h3>
            </div>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="glass-panel overflow-hidden">
          <div className="p-6 border-b border-surface-border flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Todos os Leads</h2>
            
            <select
              value={attendantFilter}
              onChange={(e) => setAttendantFilter(e.target.value)}
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="all">Todos os Vendedores</option>
              {uniqueAttendants.map(att => (
                <option key={att} value={att}>{att}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-surface/50 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Telefone</th>
                  <th className="px-6 py-4 font-medium">Vendedor (ID/Nome)</th>
                  <th className="px-6 py-4 font-medium">Status do Funil</th>
                  <th className="px-6 py-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.email || 'Sem email'}</div>
                    </td>
                    <td className="px-6 py-4">{client.phone}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-surface-border rounded-md text-xs font-medium">
                        {client.attendant || 'Nenhum'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary/20 text-primary-light border border-primary/30 rounded-full text-xs font-medium">
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedClientId(client.id)}
                        className="text-primary hover:text-primary-light text-sm font-medium transition-colors"
                      >
                        Ver Conversa
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum lead encontrado no sistema para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {selectedClientId && (
        <ClientModal
          client={clients.find(c => c.id === selectedClientId)!}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  );
}
