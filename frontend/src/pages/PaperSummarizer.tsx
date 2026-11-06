import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Download, Loader2, Clipboard, Check, HardDrive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { summarizerApi } from '../services/api';
import toast from 'react-hot-toast';

export default function PaperSummarizer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string; title: string; extracted_chars: number;
    file_id?: string; size_bytes?: number; word_count?: number; storage?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const userId = localStorage.getItem('user_id') || 'demo-user';

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,   // Frontend validation; server enforces MAX_UPLOAD_MB
    multiple: false,
  });

  const handleSummarize = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await summarizerApi.uploadPdf(file, userId, file.name.replace('.pdf', ''));
      setResult(data);
      toast.success('Paper summarized successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Summarization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const { data } = await summarizerApi.downloadSummary(result.summary, result.title);
      const blob = new Blob([data as BlobPart], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.title || 'summary').replace(/\s+/g, '_')}_summary.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: download directly from state
      const blob = new Blob([result.summary], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.title || 'summary').replace(/\s+/g, '_')}_summary.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Paper Summarizer</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
          Upload a research PDF and IBM Granite will generate a structured analysis summary.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Upload */}
        <div>
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer',
              background: isDragActive ? 'rgba(79,124,255,0.05)' : 'var(--color-surface)',
              transition: 'all 0.2s',
            }}
          >
            <input {...getInputProps()} />
            <Upload size={36} color={isDragActive ? 'var(--color-accent)' : 'var(--color-muted)'} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
              {isDragActive ? 'Drop PDF here' : 'Drag & drop your PDF'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>or click to browse · Max 50MB</p>
          </div>

          {file && (
            <div className="card fade-in" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(239,68,68,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={20} color="#ef4444" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <button className="btn-primary" onClick={handleSummarize} disabled={loading}>
                {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : 'Summarize'}
              </button>
            </div>
          )}

          {loading && (
            <div className="card fade-in" style={{ marginTop: 14, textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: 0 }}>IBM Granite is analyzing your paper...</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>This may take 30–60 seconds</p>
            </div>
          )}

          {/* Summary sections guide */}
          {!result && (
            <div className="card" style={{ marginTop: 20 }}>
              <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Summary includes:</h3>
              {['Research Objective', 'Problem Statement', 'Methodology', 'Dataset', 'Key Findings', 'Limitations', 'Future Scope'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(79,124,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, margin: 0 }}>Summary</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={handleCopy}>
                  {copied ? <Check size={13} color="#22c55e" /> : <Clipboard size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleDownload}>
                  <Download size={13} /> Download .md
                </button>
              </div>
            </div>
            <div className="card" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              <div className="prose-dark">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.summary}</ReactMarkdown>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>{result.extracted_chars?.toLocaleString()} chars · {result.word_count?.toLocaleString()} words · IBM Granite</span>
              {result.file_id && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
                  <HardDrive size={11} /> PDF saved locally
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`.animate-spin { animation: spin 0.8s linear infinite; }`}</style>
    </div>
  );
}
