'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw } from 'lucide-react';
import { useCRMStore } from '@/store/useCRMStore';

interface Message {
  id: string;
  sender: 'client' | 'agent';
  text: string;
  timestamp: Date;
}

export default function SimulatorPage() {
  const { settings } = useCRMStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: 'Olá! Como posso ajudar você hoje?',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'client',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          settings: settings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: data.text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: '❌ Erro ao obter resposta da IA. Verifique as configurações e tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'agent',
        text: 'Olá! Como posso ajudar você hoje?',
        timestamp: new Date(),
      }
    ]);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulador de IA</h1>
          <p className="text-gray-400 mt-1">Teste o comportamento da Inteligência Artificial em tempo real.</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center px-4 py-2 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors border border-surface-border"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reiniciar Conversa
        </button>
      </div>

      <div className="flex-1 bg-surface border border-surface-border rounded-xl flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => {
            const isClient = msg.sender === 'client';
            return (
              <div key={msg.id} className={`flex items-start max-w-[80%] ${isClient ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isClient ? 'bg-primary/20 text-primary ml-3' : 'bg-surface-hover text-gray-400 mr-3 border border-surface-border'}`}>
                  {isClient ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl ${isClient ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-hover text-gray-200 rounded-tl-none border border-surface-border'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-2 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-start max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-hover text-gray-400 mr-3 border border-surface-border flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-surface-hover text-gray-200 rounded-tl-none border border-surface-border">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-hover/50 border-t border-surface-border">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite uma mensagem como se fosse o cliente..."
              className="flex-1 bg-surface border border-surface-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Send className="w-5 h-5 mr-2" />
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
