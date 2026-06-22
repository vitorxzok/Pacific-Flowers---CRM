'use client';

import { Settings as SettingsIcon, UploadCloud, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [minutesFollowUp, setMinutesFollowUp] = useState(15);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.crm_settings?.minutes_without_response) {
        setMinutesFollowUp(session.user.user_metadata.crm_settings.minutes_without_response);
      }
      setMounted(true);
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    const toastId = toast.loading('Salvando configurações...');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const currentMetadata = session?.user?.user_metadata || {};
      const currentSettings = currentMetadata.crm_settings || {};
      
      const { error } = await supabase.auth.updateUser({
        data: {
          crm_settings: {
            ...currentSettings,
            minutes_without_response: Number(minutesFollowUp)
          }
        }
      });
      
      if (error) throw error;
      toast.success('Configurações salvas com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações', { id: toastId });
    } finally {
      setIsSavingSettings(false);
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
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          const rows: any[] = results.data;
          let count = 0;

          for (const row of rows) {
            const phone = row.telefone || row.phone || row.Telefone || row.Phone || row.numero || row.Numero;
            const name = row.nome || row.name || row.Nome || row.Name || 'Lead Importado';
            const email = row.email || row.Email || '';

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
                status: 'Novo',
                attendant_id: userId
              });
              count++;
            }
          }

          toast.success(`${count} leads importados com sucesso!`, { id: toastId });
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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('store_name, name, phone, status, purchase_value, purchase_date, profiles(name)')
        .eq('attendant_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!clientes || clientes.length === 0) {
        toast.error('Nenhum lead encontrado para exportar.', { id: toastId });
        setIsExporting(false);
        return;
      }

      let table = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /></head><body><table border="1">';
      table += '<tr><th>Nome do Vendedor</th><th>Nome da Loja</th><th>Nome do Cliente</th><th>Telefone</th><th>Status Atual</th><th>Valor da Compra</th><th>Data da Compra</th></tr>';
      
      clientes.forEach((c: any) => {
        table += '<tr>';
        table += `<td>${c.profiles?.name || 'Vendedor'}</td>`;
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
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const exportedIds = clientes.map((c: any) => c.id);
      if (exportedIds.length > 0) {
        await supabase.from('clientes').update({ is_exported: true }).in('id', exportedIds);
      }

      toast.success(`${clientes.length} leads exportados com sucesso!`, { id: toastId });
    } catch (error: any) {
      console.error('Erro ao exportar leads:', error);
      toast.error('Erro ao exportar leads', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <header className="px-8 py-6 border-b border-surface-border bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Configurações Gerais</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">Gerencie suas automações e importação de leads</p>
      </header>

      <div className="p-8 max-w-3xl space-y-8">
        
        {/* Automações da IA */}
        <div className="glass-panel p-8 space-y-8">
          <h2 className="text-xl font-bold text-white border-b border-surface-border pb-4">Automações da Inteligência Artificial</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
            <div className="mb-4 sm:mb-0 pr-4">
              <h3 className="text-lg font-semibold text-white">Follow-up Rápido (Inatividade)</h3>
              <p className="text-sm text-gray-400 mt-1">
                Tempo (em minutos) que a IA deve aguardar sem resposta do cliente antes de enviar a primeira mensagem de retorno perguntando se ele ainda tem interesse.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <input 
                type="number"
                min="1"
                value={minutesFollowUp}
                onChange={(e) => setMinutesFollowUp(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-background border border-surface-border rounded-lg text-white focus:outline-none focus:border-primary"
              />
              <span className="text-gray-400 text-sm">min</span>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-border">
            <button 
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${isSavingSettings ? 'bg-surface-border text-gray-400' : 'bg-primary hover:bg-primary-hover text-white shadow-lg'}`}
            >
              {isSavingSettings ? <Save className="w-5 h-5 animate-pulse" /> : <Save className="w-5 h-5" />}
              {isSavingSettings ? 'Salvando...' : 'Salvar Automações'}
            </button>
          </div>
        </div>

        <div className="glass-panel p-8 space-y-8">
          <h2 className="text-xl font-bold text-white border-b border-surface-border pb-4">Gerenciamento de Leads</h2>
          
          {/* Importar Leads */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-border pb-8">
            <div className="mb-4 sm:mb-0 pr-4">
              <h3 className="text-lg font-semibold text-white">Importar Leads (CSV)</h3>
              <p className="text-sm text-gray-400 mt-1">
                Importe uma planilha CSV com as colunas: <b>nome</b>, <b>telefone</b>, <b>email</b>. Os leads serão criados na coluna "Novo".
              </p>
            </div>
            <div className="flex items-center flex-shrink-0 relative">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csvUpload"
                disabled={isImporting}
              />
              <label 
                htmlFor="csvUpload" 
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${isImporting ? 'bg-surface-border text-gray-400' : 'bg-surface-hover border border-surface-border text-white hover:bg-surface-border'}`}
              >
                {isImporting ? 'Importando...' : 'Escolher Arquivo'}
              </label>
            </div>
          </div>

          {/* Exportar Leads */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
            <div className="mb-4 sm:mb-0 pr-4">
              <h3 className="text-lg font-semibold text-white">Exportar Leads (CSV)</h3>
              <p className="text-sm text-gray-400 mt-1">
                Baixe uma planilha CSV com todos os seus leads: Nome da loja, Cliente, Telefone, Status e Compras.
              </p>
            </div>
            <div className="flex items-center flex-shrink-0 relative">
              <button 
                onClick={handleExportLeads}
                disabled={isExporting}
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${isExporting ? 'bg-surface-border text-gray-400' : 'bg-surface-hover border border-surface-border text-white hover:bg-surface-border'}`}
              >
                {isExporting ? 'Exportando...' : 'Exportar Leads'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
