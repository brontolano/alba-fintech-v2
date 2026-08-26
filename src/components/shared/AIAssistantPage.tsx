'use client';

import { Bot, Send, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Halo Ustadz! Saya Asisten AI untuk ALBA Finance. Ada yang bisa saya bantu?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage, history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Gagal mendapatkan respons AI (${res.status})`);
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Tidak ada respons dari AI.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('[AI Assistant] Error:', error);
      toast.error('Gagal mengirim pesan', { description: error.message });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
          <Bot size={24} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asisten AI</h1>
          <p className="text-sm text-slate-500">Bantuan berbasis AI untuk ALBA Finance</p>
        </div>
      </div>

      {/* Chat Container - Full Width */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Messages Area */}
        <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed break-words">{message.content}</p>
                <p className={`text-xs mt-1 opacity-70`}>
                  {message.timestamp.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-900 rounded-2xl rounded-bl-md px-4 py-3 max-w-[70%]">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Sedang mengetik...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ketik pesan..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition flex items-center justify-center w-12 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
