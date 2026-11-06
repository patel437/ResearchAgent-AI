import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Search, MessageSquare, FileText, Lightbulb,
  Beaker, BookOpen, BookMarked, ArrowRight, Zap, Shield, Database
} from 'lucide-react';

const features = [
  { icon: Search, title: 'Intelligent Literature Search', desc: 'Search OpenAlex, arXiv, and Crossref simultaneously. AI-enhanced queries for precise results.' },
  { icon: MessageSquare, title: 'AI Research Assistant', desc: 'Conversational IBM Granite AI that explains concepts, answers questions, and suggests directions.' },
  { icon: FileText, title: 'Paper Summarizer', desc: 'Upload PDFs and get structured summaries: objective, methodology, findings, and more.' },
  { icon: Lightbulb, title: 'Research Gap Analyzer', desc: 'Identify unexplored areas in any research domain using AI-driven literature analysis.' },
  { icon: Beaker, title: 'Hypothesis Generator', desc: 'Generate primary, alternative, and null hypotheses with suggested methodologies.' },
  { icon: BookOpen, title: 'Report Generator', desc: 'Produce complete research reports with literature review, gaps, and structured citations.' },
];

const ibmBadges = [
  { color: '#4f7cff', text: 'IBM Granite AI' },
  { color: '#7c5cd8', text: 'IBM watsonx.ai' },
  { color: '#0f62fe', text: 'IBM Cloudant' },
  { color: '#198038', text: 'IBM Cloud COS' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--color-accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>ResearchAgent AI</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn-primary" onClick={() => navigate('/app/dashboard')}>
              Launch App <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem 4rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.25)', borderRadius: 20, padding: '4px 14px', marginBottom: 28 }}>
          <Zap size={13} color="var(--color-accent)" />
          <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>Powered by IBM Granite &amp; IBM Cloud</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 20 }}>
          AI-Powered Research<br />
          <span style={{ color: 'var(--color-accent)' }}>Automation Platform</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--color-muted)', maxWidth: 620, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Automate literature discovery, paper summarization, research gap identification, 
          hypothesis generation, and report preparation — all powered by IBM Granite AI.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ fontSize: 16, padding: '0.75rem 2rem' }} onClick={() => navigate('/app/dashboard')}>
            Get Started Free <ArrowRight size={16} />
          </button>
          <button className="btn-secondary" style={{ fontSize: 16, padding: '0.75rem 2rem' }} onClick={() => navigate('/app/search')}>
            Search Literature
          </button>
        </div>

        {/* IBM badges */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
          {ibmBadges.map((b) => (
            <div key={b.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
              <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>{b.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 2rem 5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: '3rem' }}>
          Six Core Research Modules
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/app/dashboard')}>
              <div style={{ width: 44, height: 44, background: 'rgba(79,124,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={22} color="var(--color-accent)" />
              </div>
              <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: 8, fontSize: 15 }}>{title}</h3>
              <p style={{ color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* IBM Tech section */}
      <section style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Built on IBM Cloud</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            Enterprise-grade AI and cloud infrastructure powering every research task.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: Brain, title: 'IBM Granite 3', desc: 'State-of-the-art open foundation model for all AI tasks' },
              { icon: Zap, title: 'IBM watsonx.ai', desc: 'Enterprise AI platform for deploying Granite models' },
              { icon: Database, title: 'IBM Cloudant', desc: 'Distributed NoSQL database for all research data' },
              { icon: Shield, title: 'IBM Cloud COS', desc: 'Secure object storage for PDFs and generated reports' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card">
                <Icon size={24} color="var(--color-accent)" style={{ marginBottom: 10 }} />
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4, fontSize: 14 }}>{title}</div>
                <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '1.5rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
        ResearchAgent AI — AICTE–IBM SkillsBuild Internship Project · Built with IBM Granite &amp; IBM Cloud
      </footer>
    </div>
  );
}
