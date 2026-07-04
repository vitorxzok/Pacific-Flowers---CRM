'use client';

import { useState } from 'react';
import { X, Mic, Send, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AudioProspectModalProps {
  onClose: () => void;
  filteredClientIds: string[];
  totalFiltered: number;
}

export function AudioProspectModal({ onClose, filteredClientIds, totalFiltered }: AudioProspectModalProps) {
  const [promptTemplate, setPromptTemplate] = useState('Olá {nome}, tudo bem? Aqui é o Vendas 06 da empresa. Temos uma oferta especial de papelaria para você hoje.');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!promptTemplate.trim()) {
      toast.error('Por favor, digite uma mensagem para ser convertida em áudio.');
      return;
    }

    if (filteredClientIds.length === 0) {
      toast.error('Nenhum cliente selecionado (verifique os filtros).');
      return;
    }

    setIsSending(true);
    try {
      // Pega o userId do usuário logado (armazenado no localStorage ou cookies)
      // Para o contexto atual assumimos 'seller_id' default ou do store
      // Como não temos acesso direto ao auth store aqui, pegamos do localStorage (ex: sb-xxx-auth-token)
      // Ou usamos um fallback para teste.
      const sellerId = "vendas06"; // Fallback, ideal seria pegar do store do CRM
      
      const response = await fetch('/api/prospect/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: filteredClientIds,
          promptTemplate,
          sellerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar prospecção.');
      }

      toast.success(data.message || 'Prospecção em áudio iniciada com sucesso!');
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro inesperado.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border bg-surface/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Prospecção com Áudio (IA)</h2>
              <p className="text-sm text-gray-400 mt-1">Dispare Voice Notes reais para a lista filtrada</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-100">
              <p className="font-semibold text-blue-300">Atenção ao Público</p>
              <p className="mt-1">Você está prestes a enviar um <strong>áudio simulado como Voice Note (PTT)</strong> para <strong>{totalFiltered}</strong> cliente(s).</p>
              <p className="mt-1">Filtre bem sua lista antes de disparar.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Mensagem (Texto que será convertido em Áudio):</label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="w-full h-32 bg-[#1a2329] border border-surface-border rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              placeholder="Digite o texto que a IA vai falar..."
            />
            <p className="text-xs text-gray-400 mt-2">Dica: Use <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">{`{nome}`}</code> para chamar o cliente pelo nome. Escreva como você falaria.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-border bg-surface/50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-6 py-2.5 rounded-xl border border-surface-border text-gray-300 hover:bg-surface-hover font-medium transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || filteredClientIds.length === 0}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Disparar Áudios</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
