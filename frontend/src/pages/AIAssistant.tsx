import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Plus, Bot, User, Loader2, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatApi } from '../services/api';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What are the latest trends in large language models?',
  'Explain transformer architecture and its applications',
  'What are the key challenges in federated learning?',
  'Summarize recent advances in quantum computing',
  'What methodologies are used in systematic literature reviews?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const userId = localStorage.getItem('user_id') || 'demo-user';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const { data } = await chatApi.send(msg, sessionId, userId);
      setSessionId(data.session_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'AI response failed');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Failed to get AI response. Check backend connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(undefined);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 3px' }}>AI Research Assistant</h1>
            <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 13 }}>
              Powered by IBM Granite · Ask research questions, get explanations, find directions
            </p>
          </div>
          <button className="btn-ghost" onClick={clearChat}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(79,124,255,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Brain size={32} color="var(--color-accent)" />
              </div>
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 18, margin: '0 0 8px' }}>IBM Granite Research Assistant</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: 14, maxWidth: 420, margin: '0 auto' }}>
                Ask me anything about research topics, methodologies, concepts, or literature. I'll help you navigate the academic landscape.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 10, fontWeight: 500 }}>Try asking:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => sendMessage(s)}>
                    <span style={{ fontSize: 13 }}>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map((msg, i) => (
              <div key={i} className="fade-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  background: msg.role === 'assistant' ? 'rgba(79,124,255,0.15)' : 'rgba(124,92,216,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {msg.role === 'assistant' ? <Bot size={16} color="var(--color-accent)" /> : <User size={16} color="#7c5cd8" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4, fontWeight: 600 }}>
                    {msg.role === 'assistant' ? 'IBM Granite AI' : 'You'}
                  </div>
                  {msg.role === 'assistant' ? (
                    <div className="prose-dark">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.6 }}>{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }} className="fade-in">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,124,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="var(--color-accent)" />
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '8px 0' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', animation: `bounce 1s ${i * 0.15}s infinite`, opacity: 0.7 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 2rem', flexShrink: 0, background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input
            className="input"
            placeholder="Ask a research question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
          />
          <button className="btn-primary" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-muted)', marginTop: 8, margin: '8px auto 0', maxWidth: 780 }}>
          IBM Granite AI may produce inaccurate information. Verify important claims with authoritative sources.
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
