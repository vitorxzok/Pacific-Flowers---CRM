'use client';

import { useCRMStore } from '@/store/useCRMStore';
import { Settings as SettingsIcon, Save, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';

export default function SettingsPage() {
  const { settings, setSettings } = useCRMStore();
  const [mounted, setMounted] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    setSettings(localSettings);
    toast.success('Configurações salvas com sucesso!');
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
            // Se as colunas estiverem com nomes diferentes, ajuste conforme necessário
            const phone = row.telefone || row.phone || row.Telefone || row.Phone || row.numero || row.Numero;
            const name = row.nome || row.name || row.Nome || row.Name || 'Lead Importado';
            const email = row.email || row.Email || '';

            if (!phone) continue;
            
            // Limpar o telefone para manter apenas números
            const cleanPhone = String(phone).replace(/\D/g, '');
            if (cleanPhone.length < 8) continue; // Número inválido
            
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
          event.target.value = ''; // Limpa o input
        }
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`, { id: toastId });
        setIsImporting(false);
      }
    });
  };

  if (!mounted) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <header className="px-8 py-6 border-b border-surface-border bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">Gerencie as preferências e automações do CRM</p>
      </header>

      <div className="p-8 max-w-3xl">
        <div className="glass-panel p-8 space-y-8">
          
          {/* Automação */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-border pb-8">
            <div className="mb-4 sm:mb-0 pr-4">
              <h3 className="text-lg font-semibold text-white">Atendimento Automático</h3>
              <p className="text-sm text-gray-400 mt-1">
                Ativa o envio automático de mensagens para novos leads e marca os cartões com um badge de "Automação Ativa".
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={localSettings.autoReplyEnabled}
                onChange={(e) => setLocalSettings({ ...localSettings, autoReplyEnabled: e.target.checked })}
              />
              <div className="w-14 h-7 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Tempo sem resposta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-border pb-8">
            <div className="mb-4 sm:mb-0 pr-4">
              <h3 className="text-lg font-semibold text-white">Tempo de Retorno Rápido</h3>
              <p className="text-sm text-gray-400 mt-1">
                Minutos sem resposta do cliente antes de alertar ou mudar status automaticamente.
              </p>
            </div>
            <div className="flex items-center flex-shrink-0">
              <input 
                type="number" 
                min="1"
                max="1440"
                value={localSettings.minutesWithoutResponse}
                onChange={(e) => setLocalSettings({ ...localSettings, minutesWithoutResponse: parseInt(e.target.value) || 15 })}
                className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="ml-3 text-gray-400 text-sm">min</span>
            </div>
          </div>

          {/* Insistência da IA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-border pb-8">
            <div className="mb-4 sm:mb-0 pr-4">
              <h3 className="text-lg font-semibold text-white">Insistência da IA</h3>
              <p className="text-sm text-gray-400 mt-1">
                Tempo em horas para a IA enviar automaticamente uma nova mensagem tentando retomar contato caso o lead não responda.
              </p>
            </div>
            <div className="flex items-center flex-shrink-0">
              <input 
                type="number" 
                min="1"
                max="72"
                value={localSettings.followUpIntervalHours}
                onChange={(e) => setLocalSettings({ ...localSettings, followUpIntervalHours: parseInt(e.target.value) || 3 })}
                className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="ml-3 text-gray-400 text-sm">horas</span>
            </div>
          </div>

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

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
