import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Download, Loader2, AlertTriangle, Clipboard, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { reportsApi, searchApi } from '../services/api';
import type { Paper } from '../services/api';
import toast from 'react-hot-toast';

export default function ReportGenerator() {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'md' | 'docx'>('md');
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const userId = localStorage.getItem('user_id') || 'demo-user';

  useEffect(() => {
    reportsApi.list(userId).then(({ data }) => setSavedReports(data.reports || [])).catch(() => {});
  }, [userId]);

  const handleSearchPapers = async () => {
    if (!topic.trim()) return;
    try {
      const { data } = await searchApi.search({ q: topic, user_id: userId });
      setPapers(data.papers.slice(0, 15));
      toast.success(`${data.papers.length} papers loaded for report generation`);
    } catch {
      toast.error('Paper search failed');
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || papers.length === 0) {
      toast.error('Please enter a topic and load papers first');
      return;
    }
    setLoading(true);
    setReport('');
    try {
      const { data } = await reportsApi.generate(topic, papers, context, userId, exportFormat);
      setReport(data.report);
      setSavedReportId(data.saved_id || null);
      toast.success('Research report generated!');
      // Refresh saved reports
      const listData = await reportsApi.list(userId);
      setSavedReports(listData.data.reports || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMd = (content: string, title: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').slice(0, 40)}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async (reportId: string | null, content: string, title: string) => {
    if (reportId) {
      try {
        const { data } = await reportsApi.download(reportId, 'docx', userId);
        const blob = new Blob([data as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_').slice(0, 40)}_report.docx`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      } catch {
        toast.error('DOCX download failed – downloading Markdown instead');
      }
    }
    handleDownloadMd(content, title);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Research Report Generator</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
          IBM Granite generates complete structured research reports with literature review, gaps, and references.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--color-surface2)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['generate', 'saved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: activeTab === t ? 'var(--color-accent)' : 'transparent',
              color: activeTab === t ? 'white' : 'var(--color-muted)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'generate' ? 'Generate Report' : `Saved Reports (${savedReports.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: report ? '380px 1fr' : '1fr', gap: 20 }}>
          {/* Input panel */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Research Topic *</label>
                <input
                  className="input"
                  placeholder="e.g., Machine Learning in Medical Imaging Diagnosis"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Additional Context (optional)</label>
                <textarea
                  className="input"
                  style={{ minHeight: 70, resize: 'vertical' }}
                  placeholder="Specific focus, domain constraints, time period..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Export Format</label>
                <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 8, padding: 3 }}>
                  {(['md', 'docx'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setExportFormat(f)}
                      style={{
                        flex: 1, padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: exportFormat === f ? 'var(--color-accent)' : 'transparent',
                        color: exportFormat === f ? 'white' : 'var(--color-muted)',
                        fontWeight: 600, fontSize: 13,
                      }}
                    >
                      {f === 'md' ? '📄 Markdown (.md)' : '📝 Word (.docx)'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button className="btn-secondary" onClick={handleSearchPapers} style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>
                  <Search size={14} /> Load Papers ({papers.length} loaded)
                </button>
              </div>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading || !topic.trim() || papers.length === 0} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : <><BookOpen size={15} /> Generate Report ({exportFormat.toUpperCase()})</>}
              </button>
            </div>

            {papers.length > 0 && (
              <div className="card" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', margin: '0 0 10px' }}>LOADED PAPERS ({papers.length})</p>
                {papers.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-accent)', flexShrink: 0 }}>[{i+1}]</span>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.3 }}>{p.title.slice(0, 60)}{p.title.length > 60 ? '...' : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{p.year} · {p.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report */}
          {report && (
            <div className="fade-in">
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={13} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#f59e0b' }}>AI-generated report. Verify all citations before academic submission.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={handleCopy}>
                  {copied ? <Check size={13} color="#22c55e" /> : <Clipboard size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => handleDownloadMd(report, topic)}>
                  <Download size={13} /> .md
                </button>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => handleDownloadDocx(savedReportId, report, topic)}>
                  <Download size={13} /> .docx
                </button>
              </div>
              <div className="card" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                <div className="prose-dark">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="card fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
              <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>IBM Granite is writing your report</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, margin: 0 }}>Generating all sections: abstract, introduction, literature review, methodology, findings, gaps, conclusion, and references...</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 8 }}>This may take 60–120 seconds</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div>
          {savedReports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ color: 'var(--color-muted)', margin: 0 }}>No saved reports yet. Generate your first report!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {savedReports.map((r) => (
                <div key={r._id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 15, margin: '0 0 4px' }}>{r.topic}</h3>
                      <p style={{ color: 'var(--color-muted)', fontSize: 12, margin: 0 }}>
                        {new Date(r.created_at).toLocaleDateString()} · {r.references?.length || 0} references
                        {r.has_local_file && <span style={{ marginLeft: 8, color: '#22c55e' }}>● saved</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => handleDownloadMd(r.content, r.topic)}>
                        <Download size={13} /> .md
                      </button>
                      <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => handleDownloadDocx(r._id, r.content, r.topic)}>
                        <Download size={13} /> .docx
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`.animate-spin { animation: spin 0.8s linear infinite; }`}</style>
    </div>
  );
}
