import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
      if (form.password !== form.confirm_password) {
        toast('Passwords do not match.', 'error');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        await api.signup({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
          password: form.password
        });
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
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      
      {/* Left Column: Branding Section (40% width) */}
      <div className="w-full md:w-[40%] md:h-full bg-slate-50 p-6 lg:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/60 flex-shrink-0 md:overflow-y-auto">
        
        {/* Top brand header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
            SQ
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">ShopIQ</span>
        </div>

        {/* Center branding text & features */}
        <div className="my-6 md:my-auto space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Smart POS & Analytics for Retail Businesses
            </h1>
            <p className="text-xs lg:text-sm font-semibold text-slate-500">
              Run your counter speed-optimized, manage real-time inventory, and track metrics on one clean platform.
            </p>
          </div>

          <div className="space-y-1.5">
            {[
              'Billing',
              'Inventory Management',
              'Customer Management',
              'Sales Analytics'
            ].map(feat => (
              <div key={feat} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="text-[#2563EB]">✓</span>
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* High-Fidelity Dashboard Mockup (Compact version) */}
          <div className="mt-4 hidden lg:block bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.01)]">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase ml-1">Live Dashboard</span>
              </div>
              <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Today</span>
            </div>
            
            {/* Mini Metrics Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Revenue</p>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">₹45,280</p>
                <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5">
                  ↑ 12.4%
                </span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Orders</p>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">320</p>
                <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5">
                  ↑ 8.2%
                </span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Low Stock</p>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">5 items</p>
                <span className="text-[8px] font-bold text-amber-600 flex items-center gap-0.5">
                  ⚠ Review
                </span>
              </div>
            </div>
            
            {/* Sales Chart Mockup */}
            <div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Hourly Sales</p>
              <div className="h-16 bg-slate-50/50 border border-slate-100 rounded-xl relative p-1 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 300 80">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="40" x2="300" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  
                  {/* Area */}
                  <path 
                    d="M 0 70 Q 50 40 100 50 T 200 20 T 300 30 L 300 80 L 0 80 Z" 
                    fill="url(#chartGrad)" 
                  />
                  
                  {/* Line */}
                  <path 
                    d="M 0 70 Q 50 40 100 50 T 200 20 T 300 30" 
                    fill="none" 
                    stroke="#2563EB" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                  />
                  
                  {/* Spark Point */}
                  <circle cx="200" cy="20" r="3.5" fill="#2563EB" />
                  <circle cx="200" cy="20" r="6.5" fill="#2563EB" fillOpacity="0.2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright/footer info */}
        <div className="text-[10px] font-semibold text-slate-400">
          © {new Date().getFullYear()} ShopIQ Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Authentication Form (60% width) */}
      <div className="w-full md:w-[60%] md:h-full bg-[#F8FAFC] flex items-center justify-center p-6 md:p-10 md:overflow-y-auto">
        <div className="w-full max-w-[420px] bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.015)]">
          <div>
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                {mode === 'login' ? 'Welcome Back 👋' : 'Create Account ✨'}
              </h2>
              <p className="text-xs lg:text-sm font-semibold text-slate-500 mt-1">
                {mode === 'login' ? 'Sign in to continue managing your business.' : 'Sign up to start managing your business.'}
              </p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                      <input 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-inner" 
                        type="text" 
                        required 
                        placeholder="Ramesh"
                        value={form.first_name} 
                        onChange={e => setForm({ ...form, first_name: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                      <input 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-inner" 
                        type="text" 
                        required 
                        placeholder="Kumar"
                        value={form.last_name} 
                        onChange={e => setForm({ ...form, last_name: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                    <input 
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-inner" 
                      type="tel" 
                      placeholder="9876543210"
                      value={form.phone} 
                      onChange={e => setForm({ ...form, phone: e.target.value })} 
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-inner" 
                  type="email" 
                  required 
                  placeholder="owner@myshop.com"
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password *</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => toast('Password reset link is sent to email.', 'success')}
                      className="text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                
                <div className="relative">
                  <input 
                    className="w-full px-4 py-2.5 pr-14 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-inner" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="••••••••"
                    value={form.password} 
                    onChange={e => setForm({ ...form, password: e.target.value })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-extrabold text-slate-400 hover:text-slate-600 transition-colors select-none"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                
                {mode === 'signup' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Min. 8 characters · must contain a letter and a number
                  </p>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Password *</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-inner" 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    value={form.confirm_password} 
                    onChange={e => setForm({ ...form, confirm_password: e.target.value })} 
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="spinner w-4 h-4 border-2 border-white border-t-transparent"></span>
                    <span>Please wait...</span>
                  </div>
                ) : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* Toggle Login/Signup Links */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            {mode === 'login' ? (
              <p className="text-sm font-semibold text-slate-500">
                New to ShopIQ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setForm({ first_name: '', last_name: '', phone: '', email: '', password: '', confirm_password: '' });
                  }}
                  className="text-[#2563EB] hover:text-blue-700 font-extrabold transition-colors"
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForm({ first_name: '', last_name: '', phone: '', email: '', password: '', confirm_password: '' });
                  }}
                  className="text-[#2563EB] hover:text-blue-700 font-extrabold transition-colors"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
