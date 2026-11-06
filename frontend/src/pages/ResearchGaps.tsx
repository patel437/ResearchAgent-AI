import React, { useState } from 'react';
import { Search, Lightbulb, Loader2, AlertTriangle, Clipboard, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { gapsApi, searchApi } from '../services/api';
import type { Paper } from '../services/api';
import toast from 'react-hot-toast';

export default function ResearchGaps() {
  const [topic, setTopic] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchMode, setSearchMode] = useState<'auto' | 'manual'>('auto');
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState('');
  const [paperCount, setPaperCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const userId = localStorage.getItem('user_id') || 'demo-user';

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setGaps('');
    try {
      if (searchMode === 'auto') {
        const { data } = await gapsApi.fromQuery(topic);
        setGaps(data.gaps);
        setPaperCount((data as any).paper_count ?? data.papers_analyzed?.length ?? 0);
        setPapers(data.papers_analyzed || []);
      } else {
        if (papers.length === 0) {
          toast.error('Please search and add papers first for manual mode');
          return;
        }
        const { data } = await gapsApi.analyze(topic, papers, userId);
        setGaps(data.gaps);
        setPaperCount(papers.length);
      }
      toast.success('Research gaps identified!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gap analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPapers = async () => {
    if (!topic.trim()) return;
    try {
      const { data } = await searchApi.search({ q: topic, user_id: userId });
      setPapers(data.papers.slice(0, 10));
      toast.success(`${data.papers.length} papers found`);
    } catch {
      toast.error('Paper search failed');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(gaps);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Research Gap Analyzer</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
          IBM Granite analyzes existing literature to identify unexplored research areas and opportunities.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Research Topic</label>
          <input
            className="input"
            placeholder="e.g., Federated learning for healthcare data privacy"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['auto', 'manual'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSearchMode(m)}
              className={searchMode === m ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13 }}
            >
              {m === 'auto' ? '🔍 Auto-search Papers' : '📋 Use Manual Papers'}
            </button>
          ))}
        </div>

        {searchMode === 'manual' && (
          <div style={{ marginBottom: 14 }}>
            <button className="btn-secondary" onClick={handleSearchPapers} style={{ fontSize: 13, marginBottom: 10 }}>
              <Search size={14} /> Search Papers for Topic
            </button>
            {papers.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                {papers.length} papers loaded: {papers.slice(0, 3).map(p => p.title.slice(0, 40)).join('; ')}...
              </div>
            )}
          </div>
        )}

        <button className="btn-primary" onClick={handleAnalyze} disabled={loading || !topic.trim()}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Analyzing with IBM Granite...</> : <><Lightbulb size={15} /> Identify Research Gaps</>}
        </button>
      </div>

      {loading && (
        <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: 0 }}>IBM Granite is analyzing research literature...</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>Searching papers + AI analysis · 30–90 seconds</p>
        </div>
      )}

      {gaps && !loading && (
        <div className="fade-in">
          {/* Disclaimer */}
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={15} color="#f59e0b" />
            <span style={{ fontSize: 13, color: '#f59e0b' }}>
              AI-generated suggestions based on {paperCount} papers. Always validate with domain experts before conducting research.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, margin: 0 }}>
              Research Gaps: <span style={{ color: 'var(--color-accent)' }}>{topic}</span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ fontSize: 12 }} onClick={handleCopy}>
                {copied ? <Check size={13} color="#22c55e" /> : <Clipboard size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{gaps}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      <style>{`.animate-spin { animation: spin 0.8s linear infinite; }`}</style>
    </div>
  );
}
