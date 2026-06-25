import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

// ─── Validation helpers ───────────────────────────────────────────────────────

const ALPHA_SPACE = /^[A-Za-z\s]+$/;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGIT_ONLY = /^\d+$/;

function validateFirstName(v) {
  if (!v || !v.trim()) return 'First name is required.';
  if (v.trim().length < 2) return 'Please enter a valid first name.';
  if (v.trim().length > 50) return 'Please enter a valid first name.';
  if (!ALPHA_SPACE.test(v.trim())) return 'Please enter a valid first name.';
  return '';
}

function validateLastName(v) {
  if (!v || !v.trim()) return ''; // optional
  if (!ALPHA_SPACE.test(v.trim())) return 'Please enter a valid last name.';
  return '';
}

function validatePhone(v) {
  if (!v || !v.trim()) return 'Phone number is required.';
  const digits = v.trim();
  if (!DIGIT_ONLY.test(digits) || digits.length !== 10)
    return 'Phone number must contain exactly 10 digits.';
  return '';
}

function validateEmail(v) {
  if (!v || !v.trim()) return 'Email address is required.';
  if (!EMAIL_RE.test(v.trim())) return 'Please enter a valid email address.';
  return '';
}

function getPasswordStrength(p) {
  if (!p) return { level: '', score: 0 };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 2) return { level: 'Weak', score };
  if (score <= 4) return { level: 'Medium', score };
  return { level: 'Strong', score };
}

function validatePassword(v) {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (v.length > 64) return 'Password must be at most 64 characters.';
  if (!/[A-Z]/.test(v)) return 'Password must contain at least 1 uppercase letter.';
  if (!/[a-z]/.test(v)) return 'Password must contain at least 1 lowercase letter.';
  if (!/\d/.test(v)) return 'Password must contain at least 1 number.';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Password must contain at least 1 special character (e.g. @, #, !).';
  return '';
}

function validateConfirmPassword(p, cp) {
  if (!cp) return 'Please confirm your password.';
  if (p !== cp) return 'Passwords do not match.';
  return '';
}

// ─── Reusable field error message ─────────────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-[10px] text-red-500 font-semibold mt-1">{msg}</p>;
}

// ─── Password strength bar ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }) {
  const { level } = getPasswordStrength(password);
  if (!password) return null;

  const colorMap = {
    Weak:   { bar: 'bg-red-400',    text: 'text-red-500'    },
    Medium: { bar: 'bg-amber-400',  text: 'text-amber-600'  },
    Strong: { bar: 'bg-emerald-500',text: 'text-emerald-600'},
  };
  const widthMap = { Weak: 'w-1/3', Medium: 'w-2/3', Strong: 'w-full' };
  const c = colorMap[level] || colorMap.Weak;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${c.bar} ${widthMap[level]}`} />
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold ${c.text}`}>
          {level === 'Weak' ? '⚠ Weak password. Please choose a stronger password.' : `Password strength: ${level}`}
        </p>
      </div>
    </div>
  );
}

// ─── Input class helper ────────────────────────────────────────────────────────

function inputCls(hasError) {
  return `w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-inner ${
    hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-slate-200 focus:ring-[#2563EB]'
  }`;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', password: '', confirm_password: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mark a field as touched and run its validator immediately on blur
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const v = form[field];
    let err = '';
    if (field === 'first_name')       err = validateFirstName(v);
    else if (field === 'last_name')   err = validateLastName(v);
    else if (field === 'phone')       err = validatePhone(v);
    else if (field === 'email')       err = validateEmail(v);
    else if (field === 'password')    err = validatePassword(v);
    else if (field === 'confirm_password') err = validateConfirmPassword(form.password, v);
    setErrors(prev => ({ ...prev, [field]: err }));
  }, [form]);

  // Live update: re-validate the changed field (only if already touched)
  const handleChange = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (touched[field]) {
        let err = '';
        if (field === 'first_name')       err = validateFirstName(value);
        else if (field === 'last_name')   err = validateLastName(value);
        else if (field === 'phone') {
          // Only allow digits, strip non-digits silently, cap at 10
          const digits = value.replace(/\D/g, '').slice(0, 10);
          next.phone = digits;
          err = validatePhone(digits);
        }
        else if (field === 'email')       err = validateEmail(value);
        else if (field === 'password')    err = validatePassword(value);
        else if (field === 'confirm_password') err = validateConfirmPassword(next.password, value);
        setErrors(e => ({ ...e, [field]: err }));
      }
      // Also re-validate confirm_password live when password changes
      if (field === 'password' && touched['confirm_password']) {
        const cpErr = validateConfirmPassword(value, next.confirm_password);
        setErrors(e => ({ ...e, confirm_password: cpErr }));
      }
      return next;
    });
  }, [touched]);

  // Phone: strip non-digits on change
  const handlePhoneChange = useCallback((value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setForm(prev => ({ ...prev, phone: digits }));
    if (touched['phone']) {
      setErrors(e => ({ ...e, phone: validatePhone(digits) }));
    }
  }, [touched]);

  const runAllValidations = () => {
    const e = {
      first_name:       validateFirstName(form.first_name),
      last_name:        validateLastName(form.last_name),
      phone:            validatePhone(form.phone),
      email:            validateEmail(form.email),
      password:         validatePassword(form.password),
      confirm_password: validateConfirmPassword(form.password, form.confirm_password),
    };
    setErrors(e);
    setTouched({ first_name: true, last_name: true, phone: true, email: true, password: true, confirm_password: true });
    return Object.values(e).every(v => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup') {
      const valid = runAllValidations();
      if (!valid) {
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        await api.signup({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          phone:      form.phone.trim(),
          email:      form.email.trim(),
          password:   form.password
        });
        toast('Account created! Logging you in...', 'success');
      }
      const res = await api.login({ email: form.email.trim(), password: form.password });
      login(res.data.user, res.data.access_token);
      if (res.data.user.business_setup_completed) {
        navigate('/dashboard');
      } else {
        navigate('/setup');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Something went wrong. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setForm({ first_name: '', last_name: '', phone: '', email: '', password: '', confirm_password: '' });
    setErrors({});
    setTouched({});
    setShowPassword(false);
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
              Smart POS &amp; Analytics for Retail Businesses
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
                <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5">↑ 12.4%</span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Orders</p>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">320</p>
                <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5">↑ 8.2%</span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Low Stock</p>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">5 items</p>
                <span className="text-[8px] font-bold text-amber-600 flex items-center gap-0.5">⚠ Review</span>
              </div>
            </div>
            
            {/* Sales Chart Mockup */}
            <div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Hourly Sales</p>
              <div className="h-16 bg-slate-50/50 border border-slate-100 rounded-xl relative p-1 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 300 80">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0"  />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="40" x2="300" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  <path d="M 0 70 Q 50 40 100 50 T 200 20 T 300 30 L 300 80 L 0 80 Z" fill="url(#chartGrad)" />
                  <path d="M 0 70 Q 50 40 100 50 T 200 20 T 300 30" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'signup' && (
                <>
                  {/* First & Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                      <input
                        className={inputCls(touched.first_name && errors.first_name)}
                        type="text"
                        placeholder="Ramesh"
                        value={form.first_name}
                        onChange={e => handleChange('first_name', e.target.value)}
                        onBlur={() => handleBlur('first_name')}
                      />
                      <FieldError msg={touched.first_name && errors.first_name} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                      <input
                        className={inputCls(touched.last_name && errors.last_name)}
                        type="text"
                        placeholder="Kumar"
                        value={form.last_name}
                        onChange={e => handleChange('last_name', e.target.value)}
                        onBlur={() => handleBlur('last_name')}
                      />
                      <FieldError msg={touched.last_name && errors.last_name} />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                    <input
                      className={inputCls(touched.phone && errors.phone)}
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={form.phone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      onBlur={() => handleBlur('phone')}
                    />
                    <FieldError msg={touched.phone && errors.phone} />
                  </div>
                </>
              )}
              
              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  className={inputCls(mode === 'signup' && touched.email && errors.email)}
                  type="email"
                  placeholder="owner@myshop.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  onBlur={() => mode === 'signup' && handleBlur('email')}
                  required
                />
                {mode === 'signup' && <FieldError msg={touched.email && errors.email} />}
              </div>
              
              {/* Password */}
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
                    className={`${inputCls(mode === 'signup' && touched.password && errors.password)} pr-14`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => handleChange('password', e.target.value)}
                    onBlur={() => mode === 'signup' && handleBlur('password')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-extrabold text-slate-400 hover:text-slate-600 transition-colors select-none"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                {mode === 'signup' && (
                  <>
                    {touched.password && errors.password
                      ? <FieldError msg={errors.password} />
                      : !errors.password && form.password
                        ? null
                        : !form.password && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Min. 8 chars · uppercase · lowercase · number · special char
                          </p>
                        )
                    }
                    <PasswordStrengthBar password={form.password} />
                  </>
                )}
              </div>

              {/* Confirm Password */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Password *</label>
                  <input
                    className={inputCls(touched.confirm_password && errors.confirm_password)}
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm_password}
                    onChange={e => handleChange('confirm_password', e.target.value)}
                    onBlur={() => handleBlur('confirm_password')}
                    required
                  />
                  <FieldError msg={touched.confirm_password && errors.confirm_password} />
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
                  onClick={() => switchMode('signup')}
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
                  onClick={() => switchMode('login')}
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
