import React, { useState } from 'react';
import { Search, Filter, BookMarked, ExternalLink, Calendar, Users, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { searchApi, referencesApi } from '../services/api';
import type { Paper } from '../services/api';

const DOMAINS = ['', 'Computer Science', 'Medicine', 'Physics', 'Biology', 'Chemistry', 'Engineering', 'Economics', 'Psychology', 'Environmental Science'];

export default function ResearchSearch() {
  const [query, setQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const userId = localStorage.getItem('user_id') || 'demo-user';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await searchApi.search({
        q: query,
        year_from: yearFrom ? Number(yearFrom) : undefined,
        year_to: yearTo ? Number(yearTo) : undefined,
        domain: domain || undefined,
        user_id: userId,
      });
      setResults(data.papers);
      if (data.papers.length === 0) toast('No papers found. Try different keywords.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Search failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (paper: Paper) => {
    try {
      await searchApi.savePaper(paper, userId);
      setSavedIds((prev) => new Set(prev).add(paper.id));
      toast.success('Paper saved to your library!');
    } catch {
      toast.error('Failed to save paper');
    }
  };

  const handleSaveRef = async (paper: Paper) => {
    try {
      await referencesApi.save(paper, userId);
      toast.success('Added to references!');
    } catch {
      toast.error('Failed to add reference');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Research Search</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
          Search OpenAlex, arXiv, and Crossref simultaneously. AI-enhanced with IBM Granite.
        </p>
      </div>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="Enter research topic, question, or keywords..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={14} color="var(--color-muted)" />
            <input
              className="input"
              style={{ width: 110 }}
              type="number"
              placeholder="Year from"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              min={1900}
              max={2026}
            />
            <input
              className="input"
              style={{ width: 110 }}
              type="number"
              placeholder="Year to"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              min={1900}
              max={2026}
            />
            <select
              className="input"
              style={{ width: 180 }}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d || 'All Domains'}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Searching OpenAlex, arXiv, and Crossref...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Search size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ color: 'var(--color-muted)', margin: 0 }}>No papers found. Try different keywords or broaden filters.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>{results.length} papers found</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {results.map((paper) => (
              <PaperCard
                key={paper.id || paper.title}
                paper={paper}
                saved={savedIds.has(paper.id)}
                onSave={() => handleSave(paper)}
                onSaveRef={() => handleSaveRef(paper)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaperCard({ paper, saved, onSave, onSaveRef }: { paper: Paper; saved: boolean; onSave: () => void; onSaveRef: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span className={`badge badge-${paper.source === 'arXiv' ? 'blue' : paper.source === 'Crossref' ? 'green' : 'purple'}`}>
              {paper.source}
            </span>
            {paper.year && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-muted)' }}>
                <Calendar size={11} /> {paper.year}
              </span>
            )}
            {paper.cited_by > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {paper.cited_by.toLocaleString()} citations
              </span>
            )}
          </div>
          <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 15, margin: '0 0 6px', lineHeight: 1.4 }}>
            {paper.source_url ? (
              <a href={paper.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}>
                {paper.title}
              </a>
            ) : paper.title}
          </h3>
          {paper.authors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-muted)', marginBottom: 6 }}>
              <Users size={12} />
              {paper.authors.slice(0, 4).join(', ')}{paper.authors.length > 4 ? ` +${paper.authors.length - 4} more` : ''}
            </div>
          )}
          {paper.abstract && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '0 0 6px', lineHeight: 1.6 }}>
                {expanded ? paper.abstract : paper.abstract.slice(0, 220) + (paper.abstract.length > 220 ? '...' : '')}
              </p>
              {paper.abstract.length > 220 && (
                <button className="btn-ghost" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setExpanded(!expanded)}>
                  <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
          {paper.doi && (
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
              DOI: <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">{paper.doi}</a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            className={saved ? 'btn-secondary' : 'btn-primary'}
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={onSave}
            disabled={saved}
          >
            <BookMarked size={13} /> {saved ? 'Saved' : 'Save'}
          </button>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={onSaveRef}>
            + Reference
          </button>
          {paper.source_url && (
            <a href={paper.source_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
              <ExternalLink size={13} /> Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
