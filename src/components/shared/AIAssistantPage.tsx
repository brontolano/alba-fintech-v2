'use client';

import { Bot, Send, Loader2, Bell, BellPlus, Sparkles, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    suggestedBroadcast?: {
      title: string;
      message: string;
      type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    };
  };
}

// Broadcast composer state
interface BroadcastDraft {
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showBroadcastComposer, setShowBroadcastComposer] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState<BroadcastDraft | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Load persisted chat dari localStorage
    const saved = localStorage.getItem('ai-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // Ignore corrupted data — fall to default greeting
      }
    }
    // Default greeting jika tidak ada riwayat
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Halo Ustadz! Saya Asisten AI untuk ALBA Finance. Ada yang bisa saya bantu?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Persist ke localStorage setiap kali messages berubah
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() && !uploadedFile || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: uploadedFile 
        ? `${inputMessage}\n📎 File terlampir: ${uploadedFile.name}` 
        : inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setUploadedFile(null);
    setIsLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      let res: Response;

      if (uploadedFile) {
        // Kirim multipart/form-data dengan file
        const formData = new FormData();
        formData.append('message', inputMessage);
        formData.append('history', JSON.stringify(history));
        formData.append('file', uploadedFile);

        res = await fetch('/api/ai/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Kirim JSON biasa
        res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: inputMessage, history }),
        });
      }

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
        metadata: data.suggestedBroadcast ? { suggestedBroadcast: data.suggestedBroadcast } : undefined,
      };

      // If AI suggests a broadcast draft, show the composer
      if (data.suggestedBroadcast) {
        setBroadcastDraft(data.suggestedBroadcast);
        setShowBroadcastComposer(true);
      }

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

      {/* Broadcast Composer Modal */}
      {showBroadcastComposer && broadcastDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                  <BellPlus size={20} className="text-brand-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Draft Broadcast</h2>
                  <p className="text-xs text-slate-500">Dibuat oleh AI — silakan edit sebelum mengirim</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBroadcastComposer(false); setBroadcastDraft(null); }}
                className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!broadcastDraft || isSending) return;

              setIsSending(true);
              try {
                const draftRes = await fetch('/api/broadcasts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: broadcastDraft.title,
                    message: broadcastDraft.message,
                    type: broadcastDraft.type,
                    priority: broadcastDraft.priority,
                  }),
                });

                if (!draftRes.ok) throw new Error('Gagal membuat draft broadcast');
                const draftData = await draftRes.json();
                const broadcastId = draftData.data.id;

                const sendRes = await fetch('/api/broadcasts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'send', broadcastId }),
                });

                if (!sendRes.ok) throw new Error('Gagal mengirim broadcast');

                toast.success('Broadcast berhasil dikirim ke semua pengguna!');
                setShowBroadcastComposer(false);
                setBroadcastDraft(null);
              } catch (error: any) {
                toast.error('Gagal mengirim broadcast', { description: error.message });
              } finally {
                setIsSending(false);
              }
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={broadcastDraft.title}
                  onChange={(e) => setBroadcastDraft({ ...broadcastDraft, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pesan</label>
                <textarea
                  value={broadcastDraft.message}
                  onChange={(e) => setBroadcastDraft({ ...broadcastDraft, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select
                    value={broadcastDraft.type}
                    onChange={(e) => setBroadcastDraft({ ...broadcastDraft, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="INFO">Info</option>
                    <option value="SUCCESS">Sukses</option>
                    <option value="WARNING">Peringatan</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={broadcastDraft.priority}
                    onChange={(e) => setBroadcastDraft({ ...broadcastDraft, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="LOW">Rendah</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Mendesak</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowBroadcastComposer(false); setBroadcastDraft(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Bell size={16} />
                      Kirim ke Semua Pengguna
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
