import React, { useState } from 'react';
import { Beaker, Search, Loader2, AlertTriangle, Clipboard, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { hypothesesApi, gapsApi, searchApi } from '../services/api';
import type { Paper } from '../services/api';
import toast from 'react-hot-toast';

export default function HypothesisGenerator() {
  const [topic, setTopic] = useState('');
  const [gaps, setGaps] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [hypotheses, setHypotheses] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'topic' | 'gaps' | 'hypotheses'>('topic');
  const userId = localStorage.getItem('user_id') || 'demo-user';

  const handleSearchAndGaps = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      // Step 1: Search papers
      const { data: searchData } = await searchApi.search({ q: topic, user_id: userId });
      setPapers(searchData.papers.slice(0, 10));
      // Step 2: Get gaps
      const { data: gapData } = await gapsApi.analyze(topic, searchData.papers.slice(0, 10), userId);
      setGaps(gapData.gaps);
      setStep('gaps');
      toast.success('Research gaps identified. Now generating hypotheses...');
      // Step 3: Generate hypotheses
      const { data: hypData } = await hypothesesApi.generate(topic, gapData.gaps, searchData.papers.slice(0, 10), userId);
      setHypotheses(hypData.hypotheses);
      setStep('hypotheses');
      toast.success('Hypotheses generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromGaps = async () => {
    if (!topic.trim() || !gaps.trim()) return;
    setLoading(true);
    try {
      const { data } = await hypothesesApi.generate(topic, gaps, papers, userId);
      setHypotheses(data.hypotheses);
      setStep('hypotheses');
      toast.success('Hypotheses generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(hypotheses);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Hypothesis Generator</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
          IBM Granite generates primary, alternative, and null hypotheses with suggested methodologies.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {[
          { key: 'topic', label: '1. Research Topic' },
          { key: 'gaps', label: '2. Identify Gaps' },
          { key: 'hypotheses', label: '3. Generate Hypotheses' },
        ].map(({ key, label }, i) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === key ? 'var(--color-accent)' : (step === 'hypotheses' && i < 2) || (step === 'gaps' && i === 0) ? 'rgba(34,197,94,0.15)' : 'var(--color-surface2)',
              color: step === key ? '#fff' : 'var(--color-muted)',
            }}>
              {label}
            </div>
            {i < 2 && <div style={{ width: 20, height: 1, background: 'var(--color-border)', margin: '0 4px' }} />}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Research Topic</label>
          <input
            className="input"
            placeholder="e.g., Deep learning applications in drug discovery"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
            Research Gaps (optional – will be auto-generated if empty)
          </label>
          <textarea
            className="input"
            style={{ minHeight: 80, resize: 'vertical' }}
            placeholder="Paste identified research gaps, or leave empty to auto-generate..."
            value={gaps}
            onChange={(e) => setGaps(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleSearchAndGaps} disabled={loading || !topic.trim()}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Beaker size={15} />}
            {loading ? 'Generating...' : 'Auto-Generate (Search + Gaps + Hypotheses)'}
          </button>
          {gaps && (
            <button className="btn-secondary" onClick={handleGenerateFromGaps} disabled={loading}>
              Generate from Provided Gaps
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: '0 0 6px' }}>
            {step === 'topic' ? 'Searching research literature...' : step === 'gaps' ? 'Identifying research gaps...' : 'Generating hypotheses with IBM Granite...'}
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: 12, margin: 0 }}>This comprehensive analysis may take 60–120 seconds</p>
        </div>
      )}

      {hypotheses && !loading && (
        <div className="fade-in">
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={15} color="#f59e0b" />
            <span style={{ fontSize: 13, color: '#f59e0b' }}>
              AI-generated hypotheses for academic exploration. Validate with domain experts before conducting research.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, margin: 0 }}>Hypotheses: <span style={{ color: 'var(--color-accent)' }}>{topic}</span></h2>
            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={handleCopy}>
              {copied ? <Check size={13} color="#22c55e" /> : <Clipboard size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="card">
            <div className="prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{hypotheses}</ReactMarkdown>
            </div>
          </div>
          {papers.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Based on {papers.length} papers including:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {papers.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--color-muted)', display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>[{i+1}]</span>
                    <span>{p.title} ({p.year})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`.animate-spin { animation: spin 0.8s linear infinite; }`}</style>
    </div>
  );
}
