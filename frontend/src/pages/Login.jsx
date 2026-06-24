import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // SEC-6: Client-side password validation (server always re-validates)
    if (mode === 'signup') {
      if (form.password.length < 8) {
        toast('Password must be at least 8 characters long.', 'error');
        setLoading(false);
        return;
      }
      if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
        toast('Password must contain at least one letter and one number.', 'error');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        await api.signup({ name: form.name, email: form.email, password: form.password });
        toast('Account created! Logging you in...', 'success');
      }
      const res = await api.login({ email: form.email, password: form.password });
      login(res.data.user, res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.message || 'Something went wrong. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated BG blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-900/40 blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-900/30 blur-[120px] animate-pulse-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-900/20 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand shadow-glow mb-4">
            <span className="text-white text-2xl font-black">SQ</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">ShopIQ</h1>
          <p className="text-slate-500 mt-2 text-sm">AI-Powered Business Intelligence for Shop Owners</p>
        </div>

        {/* Card */}
        <div className="card-glass p-8 shadow-card">
          {/* Tab Toggle */}
          <div className="flex bg-surface rounded-xl p-1 mb-7 gap-1">
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all duration-200 ${
                  mode === m ? 'bg-primary-600 text-white shadow-glow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="animate-fade-in">
                <label className="input-label">Full Name</label>
                <input className="input" type="text" required placeholder="Ramesh Kumar"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            )}
            <div>
              <label className="input-label">Email Address</label>
              <input className="input" type="email" required placeholder="owner@myshop.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" required placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              {mode === 'signup' && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Min. 8 characters · must contain a letter and a number
                </p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><span className="spinner w-4 h-4 border-white border-t-transparent"></span> Please wait...</>
              ) : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 p-4 bg-surface rounded-xl border border-surface-border">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Demo Credentials</p>
              <p className="text-xs text-slate-400">Sign up with any email to get started instantly.<br/>Demo data is auto-loaded on first run.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
