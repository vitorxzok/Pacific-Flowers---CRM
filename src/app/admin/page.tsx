'use client';

import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { Lock, Users, MessageCircle, DollarSign, LogOut, BrainCircuit, Activity, Upload, Download } from 'lucide-react';
import { ClientModal } from '@/components/ClientModal';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [attendantFilter, setAttendantFilter] = useState<string>('all');
  
  // Import/Export states
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFilter, setExportFilter] = useState<'all' | 'exported' | 'not_exported'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Diretor IA states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [directorResponse, setDirectorResponse] = useState<string | null>(null);

  const { clients, fetchAdminClients, markClientsAsExported } = useCRMStore();

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
  
  const filteredClients = clients.filter(c => {
    const matchAttendant = attendantFilter === 'all' || c.attendant === attendantFilter;
    const matchExport = exportFilter === 'all' || 
                        (exportFilter === 'exported' && c.is_exported) || 
                        (exportFilter === 'not_exported' && !c.is_exported);
    return matchAttendant && matchExport;
  });

  // Dashboard calculations based on filtered clients
  const totalLeads = filteredClients.length;
  const inProgress = filteredClients.filter(c => !['Finalizado', 'Perdido'].includes(c.status)).length;
  const closed = filteredClients.filter(c => c.status === 'Finalizado').length;

  const handleDirectorAnalysis = async () => {
    setIsAnalyzing(true);
    setDirectorResponse(null);
    try {
      // Build a summary to send to the IA
      const performanceData = {
        totalLeads,
        inProgress,
        closed,
        conversionRate: totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(1) + '%' : '0%',
        byAttendant: uniqueAttendants.map(att => {
          const attClients = clients.filter(c => c.attendant === att);
          const attClosed = attClients.filter(c => c.status === 'Finalizado').length;
          return {
            name: att,
            leads: attClients.length,
            closed: attClosed,
            conversion: attClients.length > 0 ? ((attClosed / attClients.length) * 100).toFixed(1) + '%' : '0%'
          };
        })
      };

      const response = await fetch('/api/admin/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performanceData })
      });

      if (!response.ok) throw new Error('Erro ao consultar Diretor IA');

      const data = await response.json();
      setDirectorResponse(data.reply);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar análise do Diretor IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const toastId = toast.loading('Importando leads...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const supabase = createClient();
          const rows: any[] = results.data;
          let count = 0;

          for (const row of rows) {
            const phone = row.telefone || row.phone || row.Telefone || row.Phone || row.numero || row.Numero;
            const name = row.nome || row.name || row.Nome || row.Name || 'Lead Importado';
            const email = row.email || row.Email || '';
            const storeName = row.store_name || row['Nome da Loja'] || '';

            if (!phone) continue;
            
            const cleanPhone = String(phone).replace(/\D/g, '');
            if (cleanPhone.length < 8) continue;
            
            const last8 = cleanPhone.slice(-8);

            const { data: existing } = await supabase
              .from('clientes')
              .select('id')
              .ilike('phone', `%${last8}`)
              .limit(1);

            if (!existing || existing.length === 0) {
              await supabase.from('clientes').insert({
                name: name,
                phone: cleanPhone,
                email: email,
                store_name: storeName,
                status: 'Novo',
                attendant_id: null
              });
              count++;
            }
          }

          toast.success(`${count} leads importados com sucesso!`, { id: toastId });
          fetchAdminClients(password);
        } catch (error: any) {
          console.error(error);
          toast.error('Erro ao processar importação', { id: toastId });
        } finally {
          setIsImporting(false);
          event.target.value = '';
        }
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`, { id: toastId });
        setIsImporting(false);
      }
    });
  };

  const handleExportLeads = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Exportando leads...');

    try {
      if (!filteredClients || filteredClients.length === 0) {
        toast.error('Nenhum lead encontrado para exportar.', { id: toastId });
        setIsExporting(false);
        return;
      }

      let table = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /></head><body><table border="1">';
      table += '<tr><th>Nome do Vendedor</th><th>Nome da Loja</th><th>Nome do Cliente</th><th>Telefone</th><th>Status Atual</th><th>Valor da Compra</th><th>Data da Compra</th></tr>';
      
      filteredClients.forEach((c: any) => {
        table += '<tr>';
        table += `<td>${c.attendant || ''}</td>`;
        table += `<td>${c.store_name || ''}</td>`;
        table += `<td>${c.name || ''}</td>`;
        table += `<td style="mso-number-format:'\\@'">${c.phone || ''}</td>`;
        table += `<td>${c.status || ''}</td>`;
        table += `<td>${c.purchase_value ? `R$ ${Number(c.purchase_value).toFixed(2).replace('.', ',')}` : ''}</td>`;
        table += `<td>${c.purchase_date ? new Date(c.purchase_date).toLocaleDateString('pt-BR') : ''}</td>`;
        table += '</tr>';
      });
      table += '</table></body></html>';

      const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_admin_export_${new Date().toISOString().split('T')[0]}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Marcar clientes como exportados no banco
      const exportedIds = filteredClients.map(c => c.id);
      await markClientsAsExported(exportedIds);

      toast.success(`${filteredClients.length} leads exportados com sucesso!`, { id: toastId });
    } catch (error: any) {
      console.error('Erro ao exportar leads:', error);
      toast.error('Erro ao exportar leads', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

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

        {/* Diretor Comercial IA */}
        <div className="glass-panel p-6 border border-purple-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-8 h-8 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Diretor Comercial IA</h2>
              </div>
              <p className="text-sm text-gray-400 mt-1">Análise estratégica baseada em dados reais da sua equipe.</p>
            </div>
            
            <button
              onClick={handleDirectorAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Activity className={`w-5 h-5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? 'Analisando Dados...' : 'Consultar Diretor IA'}
            </button>
          </div>

          {directorResponse && (
            <div className="mt-6 p-6 bg-surface border border-surface-border rounded-xl prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-purple-300 prose-a:text-purple-400">
              <ReactMarkdown>{directorResponse}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Tabela de Leads */}
        <div className="glass-panel overflow-hidden">
          <div className="p-6 border-b border-surface-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-bold text-white">Todos os Leads</h2>
            
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center space-x-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-surface-border text-gray-300 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Importando...' : 'Importar CSV'}</span>
              </button>
              
              <button
                onClick={handleExportLeads}
                disabled={isExporting}
                className="flex items-center space-x-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-surface-border text-gray-300 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exportando...' : 'Exportar Tudo'}</span>
              </button>

              <select
                value={exportFilter}
                onChange={(e) => setExportFilter(e.target.value as any)}
                className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="all">Exportação (Todos)</option>
                <option value="not_exported">Apenas Não Exportados</option>
                <option value="exported">Já Exportados</option>
              </select>

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
                  <tr key={client.id} className={`transition-colors ${client.is_exported ? 'bg-surface/30 hover:bg-surface/50' : 'hover:bg-surface-hover/50'}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        {client.name}
                        {client.is_exported && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold tracking-wider">
                            Exportado
                          </span>
                        )}
                      </div>
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
