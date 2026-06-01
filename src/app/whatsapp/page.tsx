'use client';

import { useState, useEffect } from 'react';
import { Smartphone, QrCode, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

type ConnectionState = 'disconnected' | 'connecting' | 'open';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStatus(data.state === 'open' ? 'open' : data.state === 'connecting' ? 'connecting' : 'disconnected');
      } else {
        // Se a instância não existe, vai dar erro 404, o que significa desconectado.
        setStatus('disconnected');
      }
    } catch (err) {
      console.error('Erro ao buscar status', err);
    }
  };

  useEffect(() => {
    // Busca status ao montar
    fetchStatus();

    // Polling contínuo
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateQRCode = async () => {
    setIsLoading(true);
    setError(null);
    setQrCode(null);
    
    try {
      const res = await fetch('/api/whatsapp/qrcode', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar QR Code');
      }

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setStatus('connecting');
      } else if (data.success) {
        // Se já retornou success sem QR code, possivelmente já está conectado
        fetchStatus();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'open': return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
      case 'connecting': return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]';
      case 'disconnected': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'open': return 'Conectado';
      case 'connecting': return 'Aguardando Leitura';
      case 'disconnected': return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'open': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'connecting': return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'disconnected': return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-700 flex items-center justify-center text-white shadow-lg">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Conexão WhatsApp</h1>
              <p className="text-gray-400 mt-1">Sincronize seu aparelho celular com o CRM.</p>
            </div>
          </div>

          <div className="glass-panel p-8 md:p-12 relative overflow-hidden">
            {/* Efeito visual de fundo */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-12 relative z-10">
              
              {/* Esquerda: Status e Controles */}
              <div className="flex-1 space-y-8 w-full">
                
                {/* Status Box */}
                <div className="bg-surface/50 border border-surface-border rounded-xl p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex items-center justify-center">
                      <div className={clsx("w-4 h-4 rounded-full transition-colors duration-300", getStatusColor())} />
                      {status === 'open' && (
                        <div className="absolute inset-0 rounded-full border border-green-500 animate-ping opacity-75" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Status da Instância</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon()}
                        <span className="text-lg font-bold text-white">{getStatusText()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info & Botão */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">Como conectar?</h2>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                    <li>Abra o WhatsApp no seu celular.</li>
                    <li>Toque em Mais opções (três pontinhos) ou Configurações.</li>
                    <li>Toque em Aparelhos Conectados e depois em Conectar um aparelho.</li>
                    <li>Clique no botão abaixo para gerar o seu QR Code.</li>
                    <li>Aponte a tela do celular para o código na tela.</li>
                  </ol>
                </div>

                <div className="pt-4 border-t border-surface-border">
                  <button 
                    onClick={generateQRCode}
                    disabled={isLoading || status === 'open'}
                    className={clsx(
                      "w-full sm:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center space-x-3 transition-all shadow-lg",
                      status === 'open' 
                        ? "bg-surface-hover text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                    )}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <QrCode className="w-5 h-5" />
                    )}
                    <span>{isLoading ? 'Gerando...' : 'Gerar QR Code'}</span>
                  </button>
                  
                  {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Direita: QR Code Display */}
              <div className="w-full md:w-[320px] shrink-0">
                <div className="aspect-square rounded-2xl bg-surface border border-surface-border shadow-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden">
                  
                  {status === 'open' ? (
                    <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-500">
                      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Pronto!</h3>
                        <p className="text-sm text-gray-400 mt-2">O seu aparelho está conectado e sincronizado.</p>
                      </div>
                    </div>
                  ) : qrCode ? (
                    <div className="relative animate-in fade-in duration-500">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-full h-full object-contain rounded-xl bg-white p-2"
                      />
                      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none rounded-xl" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center space-y-4 opacity-50">
                      <QrCode className="w-16 h-16 text-gray-500" />
                      <p className="text-sm text-gray-500 font-medium">O QR Code aparecerá aqui.</p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>

        </div>
    </div>
  );
}
