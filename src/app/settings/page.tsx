'use client';

import { useCRMStore } from '@/store/useCRMStore';
import { Settings as SettingsIcon, Save, MessageSquare, Paperclip, Trash2, Plus, UploadCloud } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Attachment } from '@/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';

export default function SettingsPage() {
  const { settings, setSettings } = useCRMStore();
  const [mounted, setMounted] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isImporting, setIsImporting] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const handleAddAttachment = () => {
    const newAttachment: Attachment = { id: uuidv4(), trigger: '', url: '', name: '', type: 'document' };
    setLocalSettings({
      ...localSettings,
      attachments: [...(localSettings.attachments || []), newAttachment]
    });
  };

  const handleUpdateAttachment = (id: string, field: keyof Attachment, value: string) => {
    const updated = (localSettings.attachments || []).map(a => 
      a.id === id ? { ...a, [field]: value } : a
    );
    setLocalSettings({ ...localSettings, attachments: updated });
  };

  const handleRemoveAttachment = (id: string) => {
    const updated = (localSettings.attachments || []).filter(a => a.id !== id);
    setLocalSettings({ ...localSettings, attachments: updated });
  };

  const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Fazendo upload...');
    
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `anexos/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      
      handleUpdateAttachment(id, 'url', publicUrl);
      handleUpdateAttachment(id, 'name', file.name);
      
      toast.success('Upload concluído!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error('Erro no upload: ' + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

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
                value={localSettings.minutesWithoutResponse || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, minutesWithoutResponse: e.target.value === '' ? 0 : parseInt(e.target.value) })}
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
                value={localSettings.followUpIntervalHours || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, followUpIntervalHours: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="ml-3 text-gray-400 text-sm">horas</span>
            </div>
          </div>

          {/* Inteligência Artificial - Contexto do Vendedor */}
          <div className="flex flex-col border-b border-surface-border pb-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Treinamento da Inteligência Artificial</h3>
              <p className="text-sm text-gray-400 mt-1">
                Configure como a IA deve se comportar ao falar com seus clientes. Cada vendedor possui sua própria inteligência isolada.
              </p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Negócio / Vendedor</label>
                <input 
                  type="text" 
                  placeholder="Ex: Carlos - Pacific Flowers"
                  value={localSettings.businessName || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, businessName: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contexto e Comportamento</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Somos uma fábrica de placas e quadros decorativos. Seu objetivo é ajudar o cliente e enviar o catálogo."
                  value={localSettings.businessContext || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, businessContext: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Catálogo de Produtos (Resumo)</label>
                <textarea 
                  rows={4}
                  placeholder="Ex: Placas de 15x20 R$ 2,00. Quadros R$ 15,00. Talões de pedido R$ 5,00."
                  value={localSettings.productsCatalog || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, productsCatalog: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Anexos e Gatilhos da IA */}
          <div className="flex flex-col border-b border-surface-border pb-8 mb-8">
            <div className="mb-6 flex justify-between items-start sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-primary" /> Anexos e Gatilhos da IA
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Faça o upload de catálogos e fotos de kits e defina um "Gatilho" para a IA enviar automaticamente. Ex: "CATALOGO", "KIT_350".
                </p>
              </div>
              <button
                onClick={handleAddAttachment}
                className="flex items-center gap-2 px-3 py-2 bg-surface-hover hover:bg-surface-border text-white text-sm font-medium rounded-lg transition-colors border border-surface-border"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            
            <div className="space-y-4">
              {(localSettings.attachments || []).length === 0 ? (
                <div className="text-center py-6 bg-surface rounded-lg border border-surface-border border-dashed">
                  <p className="text-gray-400 text-sm">Nenhum anexo configurado.</p>
                </div>
              ) : (
                (localSettings.attachments || []).map((attachment) => (
                  <div key={attachment.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-surface rounded-lg border border-surface-border">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Nome do Gatilho (Ex: CATALOGO)</label>
                      <input 
                        type="text" 
                        value={attachment.trigger}
                        onChange={(e) => handleUpdateAttachment(attachment.id, 'trigger', e.target.value.toUpperCase())}
                        placeholder="CATALOGO_PRINCIPAL"
                        className="w-full bg-background border border-surface-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Arquivo (Upload ou Link)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={attachment.url}
                          onChange={(e) => handleUpdateAttachment(attachment.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-background border border-surface-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <div className="relative flex-shrink-0">
                          <input 
                            type="file"
                            onChange={(e) => handleUploadAttachment(e, attachment.id)}
                            className="hidden"
                            id={`upload-${attachment.id}`}
                            disabled={isUploading}
                          />
                          <label 
                            htmlFor={`upload-${attachment.id}`}
                            className="flex items-center justify-center w-10 h-10 bg-surface-hover hover:bg-surface-border border border-surface-border rounded-md cursor-pointer transition-colors"
                            title="Fazer Upload"
                          >
                            <UploadCloud className="w-4 h-4 text-gray-300" />
                          </label>
                        </div>
                      </div>
                      {attachment.name && (
                        <p className="text-xs text-primary mt-1 truncate">Arquivo: {attachment.name}</p>
                      )}
                    </div>
                    <div className="flex items-end pb-[2px]">
                      <button
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
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
