'use client';

import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import { Lock, Users, MessageCircle, DollarSign, LogOut, BrainCircuit, Activity, Upload, Download, Paperclip, Trash2, Plus, UploadCloud } from 'lucide-react';
import { ClientModal } from '@/components/ClientModal';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Attachment } from '@/types';

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

  // System Prompt states
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  const { clients, fetchAdminClients, markClientsAsExported, settings, setSettings, fetchSettings } = useCRMStore();

  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isActivatingAll, setIsActivatingAll] = useState(false);
  const [isDeactivatingAll, setIsDeactivatingAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Admin users state for individual toggles
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const fetchAdminUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUserAI = async (userId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    const toastId = toast.loading(newEnabled ? 'Ativando IA para vendedor...' : 'Desativando IA para vendedor...');
    
    // Update locally instantly for better UX
    setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, auto_reply_enabled: newEnabled } : u));
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enabled: newEnabled })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      toast.success(`IA ${newEnabled ? 'ativada' : 'desativada'} com sucesso!`, { id: toastId });
    } catch (err) {
      // Revert on error
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, auto_reply_enabled: currentEnabled } : u));
      toast.error('Erro ao atualizar IA do vendedor.', { id: toastId });
    }
  };

  const handleAddAttachment = () => {
    const newAttachment: Attachment = { id: uuidv4(), trigger: '', url: '', name: '', type: 'document' };
    setLocalSettings({
      ...localSettings,
      attachments: [...(localSettings?.attachments || []), newAttachment]
    });
  };

  const handleUpdateAttachment = (id: string, field: keyof Attachment, value: string) => {
    const updated = (localSettings?.attachments || []).map((a: Attachment) => 
      a.id === id ? { ...a, [field]: value } : a
    );
    setLocalSettings({ ...localSettings, attachments: updated });
  };

  const handleRemoveAttachment = (id: string) => {
    const updated = (localSettings?.attachments || []).filter((a: Attachment) => a.id !== id);
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
      
      const updatedAttachments = (localSettings?.attachments || []).map((a: Attachment) => 
        a.id === id ? { ...a, url: publicUrl, name: file.name } : a
      );
      const newSettings = { ...localSettings, attachments: updatedAttachments };
      
      setLocalSettings(newSettings);
      await saveSettingsToServer(newSettings);
      
      toast.success('Upload concluído!', { id: toastId });
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error('Erro: ' + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0 && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  const saveSettingsToServer = async (settingsToSave: any) => {
    const toastId = toast.loading('Salvando configurações globalmente...');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, settings: settingsToSave })
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações globais');
      
      // Update local store to keep UI in sync
      await setSettings(settingsToSave);
      
      toast.success('Configurações salvas para todos os usuários!', { id: toastId });
    } catch (err) {
      toast.error('Erro ao salvar configurações.', { id: toastId });
    }
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSavingSettings(true);
    await saveSettingsToServer(localSettings);
    setIsSavingSettings(false);
  };

  const fetchGlobalPrompt = async (pwd: string) => {
    try {
      const res = await fetch(`/api/admin/system-prompt?pwd=${pwd}`);
      const data = await res.json();
      if (data.systemPrompt) {
        setSystemPrompt(`Você é a atendente virtual da Pacific Flowers.\n\nSeu objetivo é atender, entender o cliente e  conduzir para o pedido de forma rápida, simples e comercial.\n\n---\nFILTRO DE SISTEMA (PRIORIDADE MÁXIMA)\nIgnore mensagens automáticas como:\n"A conversa foi iniciada em um anúncio"\n"O compartilhamento de dados está ativado"\nResponda apenas mensagens reais do cliente.\n\n---\nREGRA DE RESPOSTA\n* Toda mensagem deve ser respondida\n* "ok", "sim", "👍" = interesse\n* Nunca repetir perguntas já respondidas\n* Sempre continuar do ponto atual da conversa mantendo o historico das conversas\n\n---\nABORDAGEM INICIAL\nSua primeira mensagem para o cliente (quando for um novo atendimento) DEVE SER EXATAMENTE o texto abaixo, sem alterar, omitir ou adicionar nenhuma palavra:\n"Olá, tudo bem? 😊\nSeja bem-vindo à Pacific Flowers.\n\nPara começarmos, qual é o seu nome?\nSomos fabricantes, você é lojista?"\n\nCaso o cliente responda que não é lojista, encerre o atendimento educadamente.\n\nLOJISTA (FLUXO PRINCIPAL)\nOlá NOME 👋\nPerfeito.\nPara facilitar seu atendimento, vou te enviar nosso catálogo com todos os produtos e preços + acesso para montar seu pedido direto.\nOs produtos são vendidos em múltiplos de 12 unidades, ok?\n\n---
ENVIO CATÁLOGO + LINK
Você pode ver todos os produtos aqui:
(INSTRUÇÃO DE SISTEMA: Chame a ferramenta 'sendAttachment' com gatilho 'CATALOGO' nesta etapa. NUNCA escreva no texto a ação de enviar, o cliente não pode ver comandos de sistema.)
E também pode montar seu pedido direto pelo link PedidoRápido:
pacific-flowers.vercel.app\n\n---\nPASSO A PASSO\n1️⃣ Escolhe os itens\n2️⃣ Acessa o carrinho\n3️⃣ Seleciona forma de pagamento\n4️⃣ Preenche dados da loja\n5️⃣ Clica em enviar\nPedido concluído ✅\n\n---\nPÓS CATÁLOGO (GATILHO)\nAssim que você visualizar, me chama aqui 😊\nSe fizer sentido pra sua loja, consigo montar um pedido sugestão com os produtos que mais vendem ou te liberar uma condição especial na primeira compra.\n\n---\nAPÓS ENVIO\nSe reclamar do pedido mínimo:\nPerguntar: Qual seria o valor ideal para iniciarmos nossa parceria?\nSe menor que 350:\nEstamos com uma campanha de novos clientes.\nVocê consegue ajustar para R$350 para aproveitarmos a oportunidade?\n\n---\nREGRA DOS KITS\n* Até R$350 → Kit R$350\n* Até R$850 → Kit R$850\n* R$850 até R$1700 → 2x Kit 750\n* Acima → multiplicar\nExemplo: 3 kits = R$2350\n\n---\nREGRA IMPORTANTE – SUGESTÃO DE VALOR\nSempre considerar o valor informado pelo cliente e sugerir o próximo kit acima.\nExemplos:\n* Cliente: R$600 → sugerir Kit R$850\n* Cliente: R$900 → sugerir 2x Kit R$850 (R$1700)\n* Cliente: R$1200 → sugerir 2x Kit R$850\nNunca sugerir valor menor que o informado.\n\n---\nREGRAS DOS KITS\n* Nunca enviar mais de um kit por vez\n* Nunca enviar vários kits juntos\n* Cada kit possui gatilho individual\n\n---\nEXPLICAÇÃO DOS KITS\nOs kits são compostos pelos produtos mais vendidos, principalmente placas indicativas, pensados para alto giro em loja.\nVou te enviar algumas fotos.\n(ENVIAR FOTO DO KIT CORRESPONDENTE)\n\n---\nFECHAMENTO\nO que achou NOME?\nPodemos fechar nesse valor?\nSe sim:\nTransferir o cliente imediatamente para um humano usando a ferramenta transferToHuman, passando um breve resumo (perfil e itens/kits de interesse).\n\n---\nSITUAÇÕES EXTRAS E REPOSIÇÃO\nReposição\n"Que bom ter você de volta, NOME! Quais produtos acabaram por aí?"\nAnotar itens → Confirmar pedido → Transferir para humano.\n\nDúvidas comuns:\nQual o pedido mínimo? R$350,00 e o frete é por conta do cliente (CIF para SP capital, FOB interior e outros estados).\nVocês enviam para todo o Brasil? Sim, via transportadora ou Correios.\nQuais as formas de pagamento? Pix, Boleto, Cartão.\n\nRegra de Transferência Imediata\nTransferir para humano se o cliente:\n"Quero falar com um atendente"\n"Não estou conseguindo fazer o pedido"\n\nA IA deve estar apta a responder a todas as demais perguntas dos clientes em qualquer hora do dia de forma simpática, prestativa e objetiva.`);
      }
    } catch (e) {}
  };

  const handleSaveSystemPrompt = async () => {
    setIsSavingPrompt(true);
    const toastId = toast.loading('Salvando treinamento global...');
    try {
      const res = await fetch('/api/admin/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, systemPrompt })
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      toast.success('Treinamento salvo para todos os usuários!', { id: toastId });
    } catch (err) {
      toast.error('Erro ao salvar treinamento.', { id: toastId });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Se a sessão for destruída ao recarregar a página, pedirá senha novamente (segurança simples e eficaz)
  
  const handleToggleGlobalAI = async (enabled: boolean) => {
    if (enabled) setIsActivatingAll(true);
    else setIsDeactivatingAll(true);
    
    const toastId = toast.loading(enabled ? 'Ativando IA para todos...' : 'Desativando IA para todos...');
    try {
      const res = await fetch('/api/admin/global-ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Falha');
      const data = await res.json();
      toast.success(`IA ${enabled ? 'ativada' : 'desativada'} para ${data.count} operadores!`, { id: toastId });
      fetchAdminUsers(); // Update the toggles visually
    } catch (err) {
      toast.error('Erro ao alterar configuração global da IA.', { id: toastId });
    } finally {
      if (enabled) setIsActivatingAll(false);
      else setIsDeactivatingAll(false);
    }
  };

  const fetchAdminGlobalSettings = async (pwd: string) => {
    try {
      const res = await fetch(`/api/admin/settings?pwd=${pwd}`);
      if (res.ok) {
        const data = await res.json();
        setLocalSettings({
          autoReplyEnabled: data.auto_reply_enabled || false,
          minutesWithoutResponse: data.minutes_without_response || 15,
          followUpIntervalHours: data.followup_interval_hours || 24,
          insistenciaMaxRepetitions: data.insistencia_max_repetitions || 3,
          insistenciaDaysInterval: data.insistencia_days_interval || 2,
          reposicao_days_global: data.reposicao_days_global || 30,
          kanbanColumns: data.kanban_columns || ['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'],
          kanbanColumnNames: data.kanban_column_names || {},
          businessName: data.business_name || '',
          businessContext: data.business_context || '',
          productsCatalog: data.products_catalog || '',
          attachments: data.attachments || []
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await fetchAdminClients(password);
    
    if (success) {
      setIsAuthenticated(true);
      fetchGlobalPrompt(password);
      fetchAdminGlobalSettings(password);
      fetchAdminUsers();
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

        {/* Treinamento Global da IA */}
        <div className="glass-panel p-6 border border-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Treinamento Global da IA</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">Configure o prompt mestre da inteligência artificial. Este treinamento será aplicado a todos os operadores.</p>
            
            <textarea
              rows={15}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-surface/50 border border-surface-border rounded-xl px-4 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono resize-y"
              placeholder="Cole o prompt aqui..."
            />
            
            <div className="mt-4 flex justify-end">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSystemPrompt(`Você é a atendente virtual da Pacific Flowers.

Seu objetivo é atender, entender a necessidade do cliente e conduzir para o pedido de forma rápida, simples e comercial.

Caso o cliente pergunte seu nome, informe que você é a atendente virtual da Pacific Flowers e está à disposição para agilizar o atendimento e esclarecer as dúvidas iniciais. Caso prefira, o cliente pode ser encaminhado para atendimento humano a qualquer momento.

--------------------------------------------------

REGRAS GERAIS

- Toda mensagem deve ser respondida.
- "ok", "sim", "👍" e mensagens curtas indicam interesse.
- Nunca repetir perguntas já respondidas.
- Sempre considerar todo o histórico da conversa.
- Sempre conduzir para a próxima etapa.
- Responder de forma objetiva e comercial.
- Se o cliente já informou o nome, nunca perguntar novamente.

------------------------------------------------
ABORDAGEM INICIAL
Sua primeira mensagem para o cliente (quando for um novo atendimento) DEVE SER EXATAMENTE o texto abaixo, sem alterar, omitir ou adicionar nenhuma palavra:
"Olá, tudo bem? 😊
Seja bem-vindo à Pacific Flowers.

Para começarmos, qual é o seu nome?
Somos fabricantes, você é lojista?"

Caso o cliente responda que não é lojista, encerre o atendimento educadamente.

--------------------------------------------------
REGRAS GERAIS E DÚVIDAS:
- Seja sempre simpática e comercial. Nunca repita perguntas.
- Nunca envie catálogos ou kits sem que seja a etapa exata.
- Se o cliente perguntar APENAS de frete ou pedido mínimo, responda a pergunta DIRETAMENTE apenas com texto, SEM enviar o PDF do catálogo.
- Pedido mínimo: R$ 750,00. Se o cliente achar alto, pergunte qual o valor ideal e ofereça um Kit.
- Frete SC/PR/RS/SP: R$ 45,00. Acima de R$3000 (CIF). Demais regiões: CIF até SP + redespacho FOB.
- Pagamento: Pix (5% desc), Cartão (30/60x), Boleto (sujeito a análise).

FLUXO DE ATENDIMENTO:

Etapa 1 - Saudação:
Diga: "Olá, tudo bem? 😊 Seja bem-vindo à Pacific Flowers. Para começarmos, qual é o seu nome? Somos fabricantes, você é lojista?"
(Se o cliente não for lojista, encerre educadamente dizendo que o foco é atacado).

Etapa 2 - Envio do Catálogo (Obrigatório após o nome):
Assim que o cliente responder o nome, você deve acionar a ferramenta "sendAttachment" com o gatilho "CATALOGO" e enviar EXATAMENTE a mensagem abaixo, incluindo a tag [SEPARAR] para que o arquivo chegue no tempo certo:
"Olá [Nome] 👋
Vou lhe enviar nosso catálogo com todos os produtos e preços e também o acesso para montar seu pedido direto.
Todos os produtos são vendidos em múltiplos de 12 unidades para facilitar a revenda.
[SEPARAR]
Você também pode montar seu pedido diretamente pelo link:
pacific-flowers.vercel.app
1️⃣ Escolha os itens
2️⃣ Acesse o carrinho
3️⃣ Escolha a forma de pagamento
4️⃣ Preencha os dados da loja
5️⃣ Clique em enviar
Pedido concluído ✅"

Etapa 3 - Sugestão de Kits:
Se o cliente quiser um kit, chame a ferramenta 'sendAttachment' com o gatilho do kit exato (Ex: 'KIT_350', 'KIT_850') e use a palavra [SEPARAR] no meio do seu texto para dar tempo da foto do kit chegar no WhatsApp do cliente antes da sua próxima frase.

Etapa 4 - Fechamento:
Sempre tente conduzir o cliente a pedir pelo link, solicitar um kit ou encaminhar para um humano. Assim que ele topar fechar pedido, acione a ferramenta de Transferência para o Humano.`,

`);
                }}
                className="px-6 py-3 bg-surface border border-surface-border text-white font-semibold rounded-lg hover:bg-surface-border transition-colors whitespace-nowrap"
              >
                Restaurar Padrão
              </button>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleSaveSystemPrompt}
                  disabled={isSavingPrompt}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSavingPrompt ? 'Salvando...' : 'Considerar prompt atual o novo padrão'}
                </button>
                <button
                  onClick={handleSaveSystemPrompt}
                  disabled={isSavingPrompt}
                  className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSavingPrompt ? 'Salvando...' : 'Salvar Treinamento Global'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>

        
                {/* Controle Global da IA */}
        <div className="glass-panel p-6 border border-surface-border relative overflow-hidden mb-6">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <BrainCircuit className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Controle Global da IA (Operadores)</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Use estes botões para ativar ou desativar o <strong>Atendimento Automático da IA</strong> para TODOS os operadores do sistema de uma única vez. 
              Após a alteração, cada operador ainda poderá ligar/desligar individualmente em seu próprio painel.
            </p>
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => handleToggleGlobalAI(true)}
                disabled={isActivatingAll || isDeactivatingAll}
                className="px-6 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isActivatingAll ? 'Ativando...' : 'Ligar IA para Todos'}
              </button>
              <button
                onClick={() => handleToggleGlobalAI(false)}
                disabled={isActivatingAll || isDeactivatingAll}
                className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeactivatingAll ? 'Desativando...' : 'Desligar IA para Todos'}
              </button>
            </div>
            
            <div className="border-t border-surface-border/50 pt-6 mt-2">
              <h3 className="text-md font-semibold text-white mb-4">Controle Individual por Vendedor</h3>
              {isLoadingUsers ? (
                <div className="text-gray-400 text-sm">Carregando vendedores...</div>
              ) : (
                <div className="space-y-3">
                  {adminUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-background/50 border border-surface-border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleToggleUserAI(user.id, user.auto_reply_enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user.auto_reply_enabled ? 'bg-green-500' : 'bg-surface-border'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  ))}
                  {adminUsers.length === 0 && <p className="text-gray-400 text-sm">Nenhum vendedor encontrado.</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configurações do CRM */}
        <div className="glass-panel p-6 border border-surface-border relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-white">Configurações de Automação e CRM</h2>
            </div>
            
            <div className="space-y-6">
              {/* Tempo sem resposta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Tempo de Retorno Rápido</h3>
                  <p className="text-sm text-gray-400">Minutos sem resposta do cliente antes de alertar ou mudar status automaticamente.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="1440"
                    value={localSettings?.minutesWithoutResponse || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, minutesWithoutResponse: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">min</span>
                </div>
              </div>

              {/* Insistência da IA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Insistência da IA</h3>
                  <p className="text-sm text-gray-400">Tempo em horas para a IA enviar automaticamente nova mensagem.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="72"
                    value={localSettings?.followUpIntervalHours || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, followUpIntervalHours: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">horas</span>
                </div>
              </div>

              {/* Dias Padrão para Reposição */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Dias Padrão para Reposição</h3>
                  <p className="text-sm text-gray-400">Dias após a compra para mover cliente para "Reposição".</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="365"
                    value={localSettings?.reposicao_days_global || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, reposicao_days_global: e.target.value === '' ? 30 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">dias</span>
                </div>
              </div>

              {/* Limite de Repetições */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Limite de Repetições (Insistência)</h3>
                  <p className="text-sm text-gray-400">Quantidade máxima de vezes para retomar contato em horas.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="10"
                    value={localSettings?.insistenciaMaxRepetitions || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, insistenciaMaxRepetitions: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">tentativas</span>
                </div>
              </div>

              {/* Insistência por Dias */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Insistência por Dias (Após limite)</h3>
                  <p className="text-sm text-gray-400">Após atingir limite de repetições, IA tentará contato a cada X dias.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="30"
                    value={localSettings?.insistenciaDaysInterval || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, insistenciaDaysInterval: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">dias</span>
                </div>
              </div>

              {/* Nomes das Colunas do Kanban */}
              <div className="flex flex-col pb-4">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-white">Nomes das Colunas do Kanban</h3>
                  <p className="text-sm text-gray-400">Personalize os nomes de exibição dos estágios.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'].map((status) => (
                    <div key={status}>
                      <label className="block text-xs font-medium text-gray-400 mb-1">{status}</label>
                      <input 
                        type="text" 
                        placeholder={status}
                        value={localSettings?.kanbanColumnNames?.[status] || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, kanbanColumnNames: { ...(localSettings?.kanbanColumnNames || {}), [status]: e.target.value } })}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Anexos e Gatilhos da IA */}
              <div className="flex flex-col border-b border-surface-border pb-8 mb-4 border-t pt-8">
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
                  {(localSettings?.attachments || []).length === 0 ? (
                    <div className="text-center py-6 bg-surface rounded-lg border border-surface-border border-dashed">
                      <p className="text-gray-400 text-sm">Nenhum anexo configurado.</p>
                    </div>
                  ) : (
                    (localSettings?.attachments || []).map((attachment: Attachment) => (
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
                            onClick={async () => {
                              const newSettings = { 
                                ...localSettings, 
                                attachments: localSettings.attachments.filter((a: any) => a.id !== attachment.id) 
                              };
                              setLocalSettings(newSettings);
                              
                              const toastId = toast.loading('Removendo...');
                              await saveSettingsToServer(newSettings);
                              toast.success('Anexo removido.', { id: toastId });
                            }}
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

                          <div className="mt-8 flex justify-end border-t border-surface-border/50 pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
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
