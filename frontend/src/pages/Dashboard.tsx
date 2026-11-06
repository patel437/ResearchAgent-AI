import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, BookOpen, BookMarked, FolderOpen,
  Search, MessageSquare, Lightbulb, Beaker, TrendingUp,
  CheckCircle, XCircle, Brain, HardDrive, ArrowRight
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import type { DashboardStats } from '../services/api';

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  to: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = localStorage.getItem('user_name') || 'Researcher';
  const userId = localStorage.getItem('user_id') || 'demo-user';

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(userId),
      dashboardApi.getActivity(userId),
    ])
      .then(([statsRes, actRes]) => {
        setStats(statsRes.data);
        setActivity(actRes.data.activities || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const statCards: StatCard[] = [
    { label: 'Total Papers', value: stats?.total_papers ?? 0, icon: FileText, color: '#4f7cff', to: '/app/search' },
    { label: 'Reports Generated', value: stats?.total_reports ?? 0, icon: BookOpen, color: '#7c5cd8', to: '/app/reports' },
    { label: 'Saved References', value: stats?.total_references ?? 0, icon: BookMarked, color: '#22c55e', to: '/app/references' },
    { label: 'Projects', value: stats?.total_projects ?? 0, icon: FolderOpen, color: '#f59e0b', to: '/app/search' },
  ];

  const quickActions = [
    { icon: Search, label: 'Search Literature', to: '/app/search', desc: 'Find research papers' },
    { icon: MessageSquare, label: 'Ask AI Assistant', to: '/app/assistant', desc: 'Chat with IBM Granite' },
    { icon: FileText, label: 'Summarize Paper', to: '/app/summarizer', desc: 'Upload PDF for analysis' },
    { icon: Lightbulb, label: 'Find Research Gaps', to: '/app/gaps', desc: 'Identify opportunities' },
    { icon: Beaker, label: 'Generate Hypotheses', to: '/app/hypotheses', desc: 'Create research hypotheses' },
    { icon: BookOpen, label: 'Generate Report', to: '/app/reports', desc: 'Create structured report' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
              Welcome back, {userName} 👋
            </h1>
            <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
              Your AI-powered research dashboard
            </p>
          </div>
          {/* Service Status */}
          {stats && (
            <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {stats.ibm_connected
                  ? <CheckCircle size={14} color="#22c55e" />
                  : <XCircle size={14} color="#f59e0b" />
                }
                <span style={{ fontSize: 12, color: stats.ibm_connected ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                  {stats.ibm_connected ? 'IBM Granite Connected' : 'Demo Mode'}
                </span>
              </div>
              <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {stats.cloudant_connected
                  ? <CheckCircle size={14} color="#22c55e" />
                  : <XCircle size={14} color="var(--color-muted)" />
                }
                <span style={{ fontSize: 12, color: stats.cloudant_connected ? '#22c55e' : 'var(--color-muted)', fontWeight: 600 }}>
                  Cloudant {stats.cloudant_connected ? 'Connected' : 'Local'}
                </span>
              </div>
              <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={14} color="#22c55e" />
                <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                  Local Storage
                  {stats.storage ? ` · ${stats.storage.pdf_count} PDFs · ${stats.storage.report_count} reports` : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demo Mode Warning */}
      {stats?.demo_mode && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={16} color="#f59e0b" />
          <span style={{ fontSize: 13, color: '#f59e0b' }}>
            <strong>Demo Mode Active</strong> — Configure IBM watsonx.ai credentials in <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>backend/.env</code> to enable real IBM Granite AI responses.
          </span>
          <button className="btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => navigate('/app/settings')}>
            Configure <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color, to }) => (
          <div key={label} className="card" style={{ cursor: 'pointer', padding: '1.25rem' }} onClick={() => navigate(to)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: `${color}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
              <TrendingUp size={14} color="var(--color-muted)" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{loading ? '—' : value}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Quick Actions */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {quickActions.map(({ icon: Icon, label, to, desc }) => (
              <button
                key={label}
                className="card"
                style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid var(--color-border)', background: 'var(--color-surface)', width: '100%' }}
                onClick={() => navigate(to)}
              >
                <div style={{ width: 36, height: 36, background: 'rgba(79,124,255,0.1)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={18} color="var(--color-accent)" />
                </div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Recent Activity</h2>
          <div className="card" style={{ padding: '1rem' }}>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-muted)' }}>
                <Brain size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 13 }}>No activity yet. Start by searching for research papers!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activity.slice(0, 8).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: item.type === 'paper_saved' ? 'rgba(79,124,255,0.1)' : 'rgba(124,92,216,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {item.type === 'paper_saved'
                        ? <FileText size={13} color="var(--color-accent)" />
                        : <BookOpen size={13} color="#7c5cd8" />
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.3 }}>{item.title?.slice(0, 50)}{item.title?.length > 50 ? '...' : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                        {item.type === 'paper_saved' ? 'Paper saved' : 'Report generated'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
