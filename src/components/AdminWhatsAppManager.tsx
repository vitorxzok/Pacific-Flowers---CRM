'use client';

import { useState, useEffect } from 'react';
import { Smartphone, QrCode, RefreshCw, CheckCircle2, XCircle, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

type InstanceState = {
  instanceName: string;
  slotId: number;
  state: 'disconnected' | 'connecting' | 'open';
  owner: string;
  phoneNumber: string;
};

interface AdminWhatsAppManagerProps {
  targetUserId: string;
  adminPwd: string;
  userName: string;
  onClose: () => void;
}

export function AdminWhatsAppManager({ targetUserId, adminPwd, userName, onClose }: AdminWhatsAppManagerProps) {
  const [instances, setInstances] = useState<InstanceState[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<number, string | null>>({});
  const [loadingSlots, setLoadingSlots] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  const MAX_SLOTS = 20;

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/whatsapp/status?targetUserId=${targetUserId}&pwd=${adminPwd}`);
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
  }, [targetUserId, adminPwd]);

  const generateQRCode = async (slotId: number) => {
    setLoadingSlots(prev => ({ ...prev, [slotId]: true }));
    setErrors(prev => ({ ...prev, [slotId]: null }));
    setQrCodes(prev => ({ ...prev, [slotId]: null }));
    
    try {
      const res = await fetch('/api/whatsapp/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, targetUserId, pwd: adminPwd })
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
    const confirm = window.confirm(`Deseja realmente desconectar o WhatsApp do slot ${slotId} para ${userName}?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, targetUserId, pwd: adminPwd })
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
    const isLoading = loadingSlots[slotId];
    const qrCode = qrCodes[slotId];
    const error = errors[slotId];
    
    const state = instance?.state || 'disconnected';
    const isConnected = state === 'open';
    const isConnecting = state === 'connecting' || !!qrCode;

    return (
      <div key={slotId} className="glass-panel p-6 border border-surface-border relative overflow-hidden flex flex-col items-center justify-center text-center h-full">
        <div className="absolute top-2 left-2 bg-surface-border px-2 py-1 rounded text-xs font-bold text-gray-400">
          Slot {slotId}
        </div>
        
        {isConnected && (
          <button 
            onClick={() => handleDisconnect(slotId)}
            className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
            title="Desconectar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="relative z-10 flex flex-col items-center w-full mt-4">
          <div className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
            isConnected ? "bg-green-500/20 text-green-400" :
            isConnecting ? "bg-yellow-500/20 text-yellow-400" :
            "bg-surface-border text-gray-400"
          )}>
            {isConnected ? <CheckCircle2 className="w-8 h-8" /> :
             isConnecting ? <RefreshCw className="w-8 h-8 animate-spin" /> :
             <Smartphone className="w-8 h-8" />}
          </div>

          <h2 className="text-lg font-bold text-white mb-2">
            {isConnected ? 'Conectado' : 
             isConnecting ? 'Aguardando Leitura' : 
             'Desconectado'}
          </h2>
          
          {isConnected && instance?.phoneNumber && (
            <p className="text-sm font-medium text-green-400 bg-green-500/10 px-3 py-1 rounded-full mb-4">
              +{instance.phoneNumber}
            </p>
          )}

          {!isConnected && !isConnecting && (
            <button
              onClick={() => generateQRCode(slotId)}
              disabled={isLoading}
              className="mt-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              {isLoading ? 'Gerando...' : 'Gerar QR Code'}
            </button>
          )}

          {isConnecting && qrCode && (
            <div className="mt-4 p-2 bg-white rounded-xl">
              <img src={qrCode} alt="QR Code WhatsApp" className="w-40 h-40" />
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-2 rounded w-full justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border border-surface-border rounded-xl shadow-2xl w-full max-w-6xl my-8 relative flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-surface-border flex items-center justify-between sticky top-0 bg-background z-20 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white">Gerenciar WhatsApp - {userName}</h2>
            <p className="text-sm text-gray-400 mt-1">Conecte ou desconecte instâncias no Evolution API em nome deste vendedor.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {slots.map(renderSlot)}
          </div>
        </div>
      </div>
    </div>
  );
}
