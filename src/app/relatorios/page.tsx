'use client';

import { useState, useEffect } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { BarChart3, TrendingUp, Users, CheckCircle2, XCircle, Percent, ArrowUpRight } from 'lucide-react';

export default function RelatoriosPage() {
  const { clients, fetchClients, settings, fetchSettings } = useCRMStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchClients();
    fetchSettings();
  }, [fetchClients, fetchSettings]);

  if (!mounted) {
    return <div className="p-8 flex-1 flex items-center justify-center text-gray-500">Carregando relatórios...</div>;
  }

  // Métricas
  const totalLeads = clients.length;
  const totalFinalizados = clients.filter(c => c.status === 'Finalizado').length;
  const totalPerdidos = clients.filter(c => c.status === 'Perdido').length;

  const conversionRate = totalFinalizados + totalPerdidos > 0 
    ? ((totalFinalizados / (totalFinalizados + totalPerdidos)) * 100).toFixed(1)
    : '0.0';

  // Distribuição por Status
  const columns = settings.kanbanColumns || ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta', 'Negociação', 'Finalizado', 'Perdido'];
  
  const statusCounts = columns.map(status => {
    const count = clients.filter(c => c.status === status).length;
    const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
    return {
      status,
      count,
      percentage
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo': return 'from-emerald-500 to-teal-600 bg-emerald-500';
      case 'Contato Feito': return 'from-amber-400 to-amber-600 bg-amber-500';
      case 'Em Qualificação': return 'from-orange-500 to-orange-600 bg-orange-500';
      case 'Proposta': return 'from-blue-500 to-blue-600 bg-blue-500';
      case 'Negociação': return 'from-indigo-500 to-indigo-600 bg-indigo-500';
      case 'Finalizado': return 'from-purple-500 to-pink-600 bg-purple-500';
      case 'Perdido': return 'from-red-500 to-rose-600 bg-red-500';
      default: return 'from-gray-500 to-gray-600 bg-gray-500';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12 bg-background relative flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Relatórios e Métricas</h1>
            <p className="text-gray-400 mt-1">Monitore o desempenho do funil de vendas e taxa de conversão em tempo real.</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Leads */}
          <div className="glass-panel p-6 relative overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-lg">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-sm text-gray-400 font-medium">Total de Leads</span>
                <h3 className="text-4xl font-extrabold text-white tracking-tight">{totalLeads}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-4 text-xs text-gray-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Leads Ativos</span>
              <span>no funil do CRM</span>
            </div>
          </div>

          {/* Card 2: Finalizados */}
          <div className="glass-panel p-6 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300 shadow-lg">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-sm text-gray-400 font-medium">Atendimentos Finalizados</span>
                <h3 className="text-4xl font-extrabold text-white tracking-tight">{totalFinalizados}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-4 text-xs text-gray-400">
              <span className="text-purple-400 font-semibold">Ganhos de Vendas</span>
              <span>com sucesso completo</span>
            </div>
          </div>

          {/* Card 3: Perdidos */}
          <div className="glass-panel p-6 relative overflow-hidden group hover:border-red-500/50 transition-all duration-300 shadow-lg">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all" />
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-sm text-gray-400 font-medium">Leads Perdidos</span>
                <h3 className="text-4xl font-extrabold text-white tracking-tight">{totalPerdidos}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-4 text-xs text-gray-400">
              <span className="text-red-400 font-semibold">Perdas / Desistências</span>
              <span>leads sem fechamento</span>
            </div>
          </div>

          {/* Card 4: Taxa de Conversão */}
          <div className="glass-panel p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300 shadow-lg">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-sm text-gray-400 font-medium">Taxa de Conversão</span>
                <h3 className="text-4xl font-extrabold text-white tracking-tight">{conversionRate}%</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-4 text-xs text-gray-400">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Conversão Geral</span>
              <span>(Ganhos vs. Perdidos)</span>
            </div>
          </div>

        </div>

        {/* Funnel Stage Distribution */}
        <div className="glass-panel p-8 md:p-10 shadow-2xl flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Distribuição do Funil</h2>
            <p className="text-sm text-gray-400 mt-1">Total de leads ativos mapeados em cada estágio do processo comercial.</p>
          </div>
          
          <div className="space-y-6">
            {statusCounts.map((stage) => {
              const bgGradient = getStatusColor(stage.status);
              
              return (
                <div key={stage.status} className="space-y-2 group">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${bgGradient}`} />
                      <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">{stage.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white mr-2">{stage.count} {stage.count === 1 ? 'lead' : 'leads'}</span>
                      <span className="text-xs text-gray-500 font-medium">({stage.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-surface border border-surface-border rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${bgGradient} transition-all duration-500`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
