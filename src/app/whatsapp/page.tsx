'use client';

import { useState, useEffect } from 'react';
import { Smartphone, QrCode, RefreshCw, CheckCircle2, XCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

type InstanceState = {
  instanceName: string;
  slotId: number;
  state: 'disconnected' | 'connecting' | 'open';
  owner: string;
  phoneNumber: string;
};

export default function WhatsAppConnection() {
  const [instances, setInstances] = useState<InstanceState[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<number, string | null>>({});
  const [loadingSlots, setLoadingSlots] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  const MAX_SLOTS = 20;

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setInstances(data.instances || []);
      }
    } catch (err) {
      console.error('Erro ao buscar status', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const generateQRCode = async (slotId: number) => {
    setLoadingSlots(prev => ({ ...prev, [slotId]: true }));
    setErrors(prev => ({ ...prev, [slotId]: null }));
    setQrCodes(prev => ({ ...prev, [slotId]: null }));
    
    try {
      const res = await fetch('/api/whatsapp/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar QR Code');
      }

      if (data.qrcode) {
        setQrCodes(prev => ({ ...prev, [slotId]: data.qrcode }));
        fetchStatus();
      } else if (data.success) {
        fetchStatus();
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [slotId]: err.message }));
      toast.error(`Erro no slot ${slotId}: ${err.message}`);
    } finally {
      setLoadingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const handleDisconnect = async (slotId: number) => {
    const confirm = window.confirm(`Deseja realmente desconectar o WhatsApp do slot ${slotId}?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId })
      });
      
      if (res.ok) {
        toast.success(`Slot ${slotId} desconectado com sucesso!`);
        fetchStatus();
      } else {
        const data = await res.json();
        toast.error(`Erro ao desconectar: ${data.error}`);
      }
    } catch (err) {
      toast.error('Erro de conexão ao desconectar.');
    }
  };

  const renderSlot = (slotId: number) => {
    const instance = instances.find(inst => inst.slotId === slotId);
    const state = instance?.state || 'disconnected';
    const qrCode = qrCodes[slotId];
    const isLoading = loadingSlots[slotId];
    const error = errors[slotId];

    return (
      <div key={slotId} className="glass-panel p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-green-500/5 rounded-full blur-2xl" />
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            Conexão {slotId}
          </h3>
          {(state === 'open' || state === 'connecting' || !!qrCode) && (
            <button 
              onClick={() => handleDisconnect(slotId)}
              className="text-red-400 hover:text-red-300 transition-colors p-2"
              title="Desconectar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center justify-center min-h-[250px] bg-surface/50 rounded-xl p-4 border border-surface-border">
          {state === 'open' ? (
            <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center relative">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div className="absolute inset-0 rounded-full border border-green-500 animate-ping opacity-50" />
              </div>
              <div>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold mb-2 inline-block">Conectado</span>
                <p className="text-white font-medium break-all">{instance?.phoneNumber || instance?.owner || 'Desconhecido'}</p>
              </div>
            </div>
          ) : qrCode ? (
            <div className="relative animate-in fade-in duration-500 w-full aspect-square max-w-[200px]">
              <img 
                src={qrCode} 
                alt={`QR Code Slot ${slotId}`} 
                className="w-full h-full object-contain rounded-xl bg-white p-2"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4 opacity-70">
              <QrCode className="w-12 h-12 text-gray-500" />
              <p className="text-sm text-gray-400">Slot Livre</p>
              <button 
                onClick={() => generateQRCode(slotId)}
                disabled={isLoading}
                className="mt-2 px-6 py-2 bg-surface-hover hover:bg-green-500/20 hover:text-green-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isLoading ? 'Gerando...' : 'Gerar QR Code'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-700 flex items-center justify-center text-white shadow-lg">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Conexão WhatsApp</h1>
                <p className="text-gray-400 mt-1">Conecte até 20 números de WhatsApp diferentes para atendimento.</p>
              </div>
            </div>
            
            <div className="bg-surface border border-surface-border px-4 py-2 rounded-xl flex items-center gap-3">
               <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
               <span className="text-sm font-medium text-white">{instances.filter(i => i.state === 'open').length} Conexões Ativas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).map(slotId => renderSlot(slotId))}
          </div>

        </div>
    </div>
  );
}
