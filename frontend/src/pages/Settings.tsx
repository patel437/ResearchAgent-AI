import React, { useState } from 'react';
import { ExternalLink, HardDrive, Brain, Database, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Settings() {
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.get('/ibm/test');
      setTestResult(data);
      if (data.success) {
        toast.success('IBM Granite connected successfully!');
      } else {
        toast.error('IBM connection failed – see details below');
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.response?.data?.detail || err.message });
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const services = [
    {
      icon: Brain,
      name: 'IBM watsonx.ai (Granite)',
      key: 'IBM_API_KEY + WATSONX_PROJECT_ID',
      desc: 'Primary AI engine for all research tasks. Required for real AI responses.',
      docs: 'https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/ml-authentication.html',
      required: true,
      color: '#4f7cff',
    },
    {
      icon: Database,
      name: 'IBM Cloudant',
      key: 'CLOUDANT_URL + CLOUDANT_APIKEY',
      desc: 'NoSQL database for storing projects, papers, reports, references, and chat history. Optional — falls back to in-memory mode.',
      docs: 'https://cloud.ibm.com/docs/Cloudant',
      required: false,
      color: '#7c5cd8',
    },
    {
      icon: HardDrive,
      name: 'Local Document Storage',
      key: 'LOCAL_STORAGE_PATH (default: uploads/)',
      desc: 'Stores uploaded PDFs in uploads/research_papers/ and generated reports in uploads/generated_reports/. No cloud subscription required.',
      docs: '',
      required: false,
      color: '#22c55e',
    },
  ];

  const steps = [
    { step: 1, title: 'Create IBM Cloud Account', desc: 'Sign up at cloud.ibm.com', link: 'https://cloud.ibm.com' },
    { step: 2, title: 'Create watsonx.ai Project', desc: 'Go to dataplatform.cloud.ibm.com → New Project', link: 'https://dataplatform.cloud.ibm.com' },
    { step: 3, title: 'Get IBM Cloud API Key', desc: 'IBM Cloud → Manage → Access → API Keys → Create', link: 'https://cloud.ibm.com/iam/apikeys' },
    { step: 4, title: 'Create Cloudant Instance (optional)', desc: 'IBM Cloud Catalog → Cloudant → Lite (free) tier', link: 'https://cloud.ibm.com/catalog/services/cloudant' },
    { step: 5, title: 'Copy .env.example → backend/.env', desc: 'Fill in IBM credentials. No COS credentials needed.', link: '' },
    { step: 6, title: 'Restart Backend', desc: 'uvicorn main:app --reload', link: '' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Settings</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: 14 }}>
          Configure IBM Cloud services. All credentials go in{' '}
          <code style={{ background: 'var(--color-surface2)', padding: '1px 6px', borderRadius: 4 }}>backend/.env</code>
        </p>
      </div>

      {/* Service overview */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 16 }}>Service Configuration</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {services.map((svc) => (
            <div key={svc.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: `${svc.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svc.icon size={18} color={svc.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{svc.name}</span>
                  <span className={`badge ${svc.required ? 'badge-red' : 'badge-green'}`}>
                    {svc.required ? 'Required for AI' : 'Optional'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 4 }}>{svc.desc}</div>
                <code style={{ fontSize: 11, color: 'var(--color-accent)' }}>{svc.key}</code>
              </div>
              {svc.docs && (
                <a href={svc.docs} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 12, flexShrink: 0 }}>
                  <ExternalLink size={12} /> Docs
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Local storage info */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(34,197,94,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <HardDrive size={18} color="#22c55e" />
          <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 15, margin: 0 }}>Local Document Storage</h2>
          <span className="badge badge-green">Active · No subscription required</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '0 0 14px' }}>
          IBM Cloud Object Storage has been replaced with secure local disk storage. No paid subscription is required.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Uploaded PDFs', path: 'uploads/research_papers/{user_id}/' },
            { label: 'Generated Reports', path: 'uploads/generated_reports/{user_id}/' },
            { label: 'Max Upload Size', path: 'Configurable via MAX_UPLOAD_MB (default 50 MB)' },
            { label: 'Access Control', path: 'User ID checked against Cloudant metadata' },
          ].map(({ label, path }) => (
            <div key={label} style={{ background: 'var(--color-surface2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 2 }}>{label}</div>
              <code style={{ fontSize: 11, color: '#22c55e', wordBreak: 'break-all' }}>{path}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Setup steps */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 16 }}>IBM Cloud Setup Guide</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map(({ step, title, desc, link }) => (
            <div key={step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--color-accent)', flexShrink: 0 }}>{step}</div>
              <div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{desc}</div>
                {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--color-accent)' }}>{link} ↗</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IBM Connection Test */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, margin: 0 }}>IBM Granite Connection Test</h2>
          <button className="btn-primary" onClick={handleTestConnection} disabled={testing} style={{ fontSize: 13 }}>
            {testing ? <><Loader2 size={14} className="animate-spin" /> Testing...</> : <><RefreshCw size={14} /> Test Connection</>}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '0 0 12px' }}>
          Sends a minimal live request to IBM watsonx.ai to verify your credentials work end-to-end.
        </p>
        {testResult && (
          <div className="fade-in" style={{
            background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: testResult.success ? 8 : 12 }}>
              {testResult.success
                ? <CheckCircle size={16} color="#22c55e" />
                : <XCircle size={16} color="#ef4444" />
              }
              <span style={{ fontWeight: 700, color: testResult.success ? '#22c55e' : '#ef4444', fontSize: 14 }}>
                {testResult.success ? 'IBM Granite Connected ✓' : 'Connection Failed'}
              </span>
            </div>
            {testResult.success ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Model: <code style={{ color: '#22c55e' }}>{testResult.model}</code></div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Project: <code style={{ color: '#22c55e' }}>{testResult.project_id_prefix}</code></div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Response: <em style={{ color: 'var(--color-text)' }}>{testResult.response_preview}</em></div>
              </div>
            ) : (
              <div>
                {testResult.fix && (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#f87171', margin: '0 0 8px', lineHeight: 1.6 }}>{testResult.fix}</pre>
                )}
                {testResult.error && !testResult.fix && (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#f87171', margin: 0 }}>{testResult.error}</pre>
                )}
                {testResult.ibm_error && (
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}>IBM raw error: {testResult.ibm_error}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* .env template */}
      <div className="card">
        <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 14 }}>backend/.env Template</h2>
        <pre style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 8, fontSize: 12, color: 'var(--color-muted)', overflow: 'auto', margin: 0, lineHeight: 1.7 }}>
{`# IBM watsonx.ai (required for AI)
IBM_API_KEY=your_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-3-8b-instruct

# IBM Cloudant (optional)
CLOUDANT_URL=https://your-instance.cloudantnosqldb.appdomain.cloud
CLOUDANT_APIKEY=your_cloudant_api_key

# Local Document Storage (replaces IBM COS)
LOCAL_STORAGE_PATH=uploads
MAX_UPLOAD_MB=50

# App
DEMO_MODE=false
SECRET_KEY=change-this-to-random-string`}
        </pre>
        <div style={{ marginTop: 12 }}>
          <button
            className="btn-primary"
            style={{ fontSize: 13 }}
            onClick={() => { navigator.clipboard.writeText('cp .env.example backend/.env'); toast.success('Command copied!'); }}
          >
            Copy Setup Command
          </button>
        </div>
      </div>

      {/* Granite model info */}
      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 12 }}>IBM Granite Model</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Model ID', value: 'ibm/granite-3-8b-instruct' },
            { label: 'Type', value: 'Instruct (chat-tuned)' },
            { label: 'Parameters', value: '8 Billion' },
            { label: 'Context Window', value: '128K tokens' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--color-surface2)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{value}</div>
            </div>
          ))}
        </div>
        <a href="https://www.ibm.com/granite" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13 }}>
          <ExternalLink size={13} /> Learn more about IBM Granite
        </a>
      </div>
    </div>
  );
}
