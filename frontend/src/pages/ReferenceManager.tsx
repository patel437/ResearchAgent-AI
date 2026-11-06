import React, { useState, useEffect } from 'react';
import { BookMarked, Clipboard, Check, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { referencesApi } from '../services/api';
import toast from 'react-hot-toast';

type CitationFormat = 'apa' | 'mla' | 'ieee' | 'bibtex';

interface Reference {
  _id: string;
  _rev?: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string;
  journal: string;
  url: string;
  source: string;
  citations?: Record<CitationFormat, string>;
}

export default function ReferenceManager() {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<CitationFormat>('apa');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const userId = localStorage.getItem('user_id') || 'demo-user';

  useEffect(() => {
    loadRefs();
  }, [userId]);

  const loadRefs = async () => {
    setLoading(true);
    try {
      const { data } = await referencesApi.list(userId);
      setRefs(data.references || []);
    } catch {
      toast.error('Failed to load references');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ref: Reference) => {
    try {
      await referencesApi.delete(ref._id, ref._rev || '', userId);
      setRefs((prev) => prev.filter((r) => r._id !== ref._id));
      toast.success('Reference deleted');
    } catch {
      toast.error('Failed to delete reference');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Citation copied!');
  };

  const handleExportBibtex = async () => {
    try {
      const { data } = await referencesApi.exportAll(userId);
      const blob = new Blob([data.bibtex || data], { type: 'application/x-bibtex' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'references.bib';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('BibTeX exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  const formatLabel: Record<CitationFormat, string> = {
    apa: 'APA 7th',
    mla: 'MLA 9th',
    ieee: 'IEEE',
    bibtex: 'BibTeX',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Reference Manager</h1>
          <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
            {refs.length} references · APA, MLA, IEEE, BibTeX citation formats
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Format selector */}
          <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 8, padding: 3 }}>
            {(Object.keys(formatLabel) as CitationFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: format === f ? 'var(--color-accent)' : 'transparent',
                  color: format === f ? 'white' : 'var(--color-muted)',
                }}
              >
                {formatLabel[f]}
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={handleExportBibtex} style={{ fontSize: 13 }}>
            <Download size={14} /> Export BibTeX
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 12px' }} />
        </div>
      )}

      {!loading && refs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookMarked size={40} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
          <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>No references yet</h3>
          <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: 0 }}>
            Save papers from Research Search to build your reference library.
          </p>
        </div>
      )}

      {!loading && refs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {refs.map((ref, idx) => {
            const citation = ref.citations?.[format] || '';
            const isExpanded = expandedId === ref._id;

            return (
              <div key={ref._id} className="card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 700 }}>[{idx + 1}]</span>
                      {ref.source && <span className="badge badge-blue">{ref.source}</span>}
                      {ref.year && <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{ref.year}</span>}
                    </div>
                    <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 14, margin: '0 0 5px', lineHeight: 1.4 }}>
                      {ref.doi ? (
                        <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}>{ref.title}</a>
                      ) : ref.title}
                    </h3>
                    {ref.authors.length > 0 && (
                      <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '0 0 4px' }}>
                        {ref.authors.slice(0, 4).join(', ')}{ref.authors.length > 4 ? ' et al.' : ''}
                      </p>
                    )}

                    {/* Citation */}
                    <div style={{ background: 'var(--color-surface2)', borderRadius: 7, padding: '8px 12px', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>{format.toUpperCase()} Citation</span>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => handleCopy(ref._id, citation)}
                        >
                          {copiedId === ref._id ? <Check size={11} color="#22c55e" /> : <Clipboard size={11} />}
                          {copiedId === ref._id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <code style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {format === 'bibtex' ? (
                          <pre style={{ margin: 0, overflow: 'auto', maxHeight: isExpanded ? 200 : 60 }}>{citation}</pre>
                        ) : citation}
                      </code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setExpandedId(isExpanded ? null : ref._id)}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--color-error)' }} onClick={() => handleDelete(ref)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {(Object.keys(formatLabel) as CitationFormat[]).map((f) => (
                        <div key={f} style={{ background: 'var(--color-surface2)', borderRadius: 7, padding: '8px 10px' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 4 }}>{formatLabel[f]}</div>
                          <code style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5, wordBreak: 'break-all' }}>
                            {f === 'bibtex' ? (
                              <pre style={{ margin: 0, overflow: 'auto', maxHeight: 100, fontSize: 10 }}>{ref.citations?.[f] || ''}</pre>
                            ) : (ref.citations?.[f] || '')}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
