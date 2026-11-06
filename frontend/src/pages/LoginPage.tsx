import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { data } = await authApi.register(name, email, password);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user_name', data.name);
        toast.success('Account created! Welcome to ResearchAgent AI.');
      } else {
        const { data } = await authApi.login(email, password);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user_name', data.name);
        toast.success(`Welcome back, ${data.name}!`);
      }
      navigate('/app/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    localStorage.setItem('user_id', 'demo-user');
    localStorage.setItem('user_name', 'Demo Researcher');
    navigate('/app/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: 'var(--color-accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Brain size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>ResearchAgent AI</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your research account'}
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: mode === m ? 'var(--color-accent)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--color-muted)',
                  fontWeight: 600, fontSize: 14, transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 6, fontWeight: 500 }}>Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === 'register'}
                />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 6, fontWeight: 500 }}>Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="researcher@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 6, fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
              {loading ? <><div className="loading-spinner" style={{ width: 16, height: 16 }} /> Processing...</> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <button className="btn-secondary" onClick={handleDemo} style={{ width: '100%', justifyContent: 'center' }}>
            Continue as Demo User
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted)', marginTop: 20 }}>
          AICTE–IBM SkillsBuild Internship Project
        </p>
      </div>
    </div>
  );
}
