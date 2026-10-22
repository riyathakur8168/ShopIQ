import { useState, useCallback, useEffect, useRef } from 'react';
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
  if (!v || !v.trim()) return 'Mobile number is required.';
  let digits = v.trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10)
    return 'Mobile number must contain exactly 10 digits.';
  if (!/^[6-9]/.test(digits))
    return `Invalid mobile number: Indian numbers cannot start with "${digits[0]}". Must start with 6, 7, 8, or 9.`;
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

function validateForgotPhone(v) {
  if (!v || !v.trim()) return 'Mobile number is required.';
  let digits = v.trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10)
    return 'Mobile number must contain exactly 10 digits.';
  if (!/^[6-9]/.test(digits))
    return `Invalid mobile number: Indian numbers cannot start with "${digits[0]}". Must start with 6, 7, 8, or 9.`;
  return '';
}

function validateForgotEmail(v) {
  if (!v || !v.trim()) return 'Email address is required.';
  if (!EMAIL_RE.test(v.trim())) return 'Please enter a valid email address.';
  return '';
}

function validateForgotNewPassword(v) {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) {
    return 'Password must contain both letters and numbers.';
  }
  return '';
}

function AnimatedCounter({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = parseInt(value, 10) || 0;
    if (start === end) return;

    const range = end - start;
    const totalTicks = 20;
    const tickDuration = duration / totalTicks;
    let tick = 0;

    const timer = setInterval(() => {
      tick++;
      const progress = tick / totalTicks;
      const easedProgress = progress * (2 - progress);
      const val = Math.floor(start + range * easedProgress);
      setDisplayValue(val);

      if (tick >= totalTicks) {
        setDisplayValue(end);
        clearInterval(timer);
      }
    }, tickDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function LiveShowcase({ metrics }) {
  const [activeLog, setActiveLog] = useState([
    { id: 1, text: "New Invoice Generated: ₹1,250", type: "invoice" },
    { id: 2, text: "Stock Alert: Beverages (Low) ⚠️", type: "stock" },
    { id: 3, text: "Payment Received: Amit Patel (₹850)", type: "payment" }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);

  // Live log rotation
  useEffect(() => {
    const logs = [
      { text: "New Invoice Generated: ₹1,250", type: "invoice" },
      { text: "Stock Alert: Beverages (Low Stock) ⚠️", type: "stock" },
      { text: "Payment Received: Amit Patel (₹850)", type: "payment" },
      { text: "Customer Rahul Verma cleared ₹500 dues.", type: "payment" },
      { text: "Stock Alert: Tomato Ketchup (Critical) 🔴", type: "stock" },
      { text: "Inventory Restocked: Beverages (+100 items)", type: "invoice" }
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % logs.length;
      setActiveLog(prev => {
        const next = [...prev.slice(1), { id: Date.now(), ...logs[idx] }];
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Search input typing simulation
  useEffect(() => {
    const phrases = ["Rahul Verma", "Beverages", "Priya Singh", "Tomato Ketchup"];
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timer;

    const tick = () => {
      const fullPhrase = phrases[phraseIdx];
      if (!isDeleting) {
        setSearchQuery("Searching: " + fullPhrase.slice(0, charIdx + 1));
        charIdx++;
        if (charIdx === fullPhrase.length) {
          isDeleting = true;
          timer = setTimeout(tick, 2000);
        } else {
          timer = setTimeout(tick, 100);
        }
      } else {
        setSearchQuery("Searching: " + fullPhrase.slice(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          timer = setTimeout(tick, 500);
        } else {
          timer = setTimeout(tick, 50);
        }
      }
    };

    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex gap-3 items-stretch select-none mt-2 w-full">
      {/* Glassmorphic Dashboard Showcase */}
      <div className="flex-1 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-3xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col gap-2.5 text-left">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-black text-slate-900 tracking-tight">Dashboard: Live Activity</h3>
            <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded tracking-wider border border-slate-200/50">Simulated</span>
          </div>
          <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1 py-0.5 rounded-full">Today</span>
        </div>

        {/* Inner Grid */}
        <div className="grid grid-cols-3 gap-2 flex-1">
          {/* Card 1: Smart Billing */}
          <div 
            onMouseEnter={() => setHoveredCard('billing')}
            onMouseLeave={() => setHoveredCard(null)}
            className="bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between relative group hover:shadow hover:bg-white hover:border-slate-200/60 transition-all duration-300"
          >
            <div className="space-y-1">
              <h4 className="text-[8.5px] font-extrabold text-slate-800 tracking-wide uppercase">Billing Counter</h4>
              <div className="relative">
                <input 
                  type="text" 
                  readOnly 
                  value={searchQuery}
                  className="w-full bg-white border border-slate-200 text-[8.5px] font-bold text-slate-700 px-1.5 py-0.5 rounded-md focus:outline-none pointer-events-none"
                />
                <span className="absolute right-1.5 top-1 text-[8px] opacity-40">🔍</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[8px] font-semibold text-slate-600 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                  <span>Prod A - ₹500</span>
                  <span className="text-emerald-600 font-bold">+500</span>
                </div>
                <div className="flex items-center justify-between text-[8px] font-semibold text-slate-600 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                  <span>Prod B - ₹750</span>
                  <span className="text-red-500 font-bold">-750</span>
                </div>
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 mt-1.5">
              <div className="flex justify-between text-[8.5px] font-black text-slate-900">
                <span>Total Due</span>
                <span>₹45,200</span>
              </div>
              <button type="button" className="w-full bg-primary-600 hover:bg-primary-700 text-white text-[8px] font-bold py-1 rounded transition-colors pointer-events-none mt-1">
                Generate Invoice
              </button>
            </div>

            {/* Hover Tooltip */}
            {hoveredCard === 'billing' && (
              <div className="absolute z-10 bottom-full left-0 mb-2 w-44 bg-slate-800 text-white text-[9px] font-semibold p-2 rounded-xl shadow-lg border border-slate-700/50 leading-relaxed animate-fade-in">
                Process sales faster with our accelerated checkout system.
              </div>
            )}
          </div>

          {/* Card 2: Inventory Status */}
          <div 
            onMouseEnter={() => setHoveredCard('inventory')}
            onMouseLeave={() => setHoveredCard(null)}
            className="bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between relative group hover:shadow hover:bg-white hover:border-slate-200/60 transition-all duration-300"
          >
            <div className="space-y-1.5">
              <h4 className="text-[8.5px] font-extrabold text-slate-800 tracking-wide uppercase">Inventory Tracker</h4>
              <div className="space-y-1">
                <div>
                  <div className="flex justify-between text-[7.5px] font-bold text-slate-600">
                    <span>Beverages</span>
                    <span className="text-emerald-600">85%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[7.5px] font-bold text-slate-600">
                    <span>Groceries</span>
                    <span className="text-amber-500">28% ⚠️</span>
                  </div>
                  <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-amber-500 rounded-full w-[28%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[7.5px] font-bold text-slate-600">
                    <span>Snacks</span>
                    <span className="text-red-500">8% 🔴</span>
                  </div>
                  <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-red-500 rounded-full w-[8%]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 mt-1.5 flex items-center justify-between">
              <span className="text-[7.5px] font-bold text-slate-400">Low Stock Alerts</span>
              <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-1 py-0.2 rounded">3</span>
            </div>

            {/* Hover Tooltip */}
            {hoveredCard === 'inventory' && (
              <div className="absolute z-10 bottom-full left-0 mb-2 w-44 bg-slate-800 text-white text-[9px] font-semibold p-2 rounded-xl shadow-lg border border-slate-700/50 leading-relaxed animate-fade-in">
                Real-time stock alerts and progress bar tracking.
              </div>
            )}
          </div>

          {/* Card 3: Khata / Ledger */}
          <div 
            onMouseEnter={() => setHoveredCard('ledger')}
            onMouseLeave={() => setHoveredCard(null)}
            className="bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between relative group hover:shadow hover:bg-white hover:border-slate-200/60 transition-all duration-300"
          >
            <div className="space-y-1.5">
              <h4 className="text-[8.5px] font-extrabold text-slate-800 tracking-wide uppercase">Ledger Preview</h4>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-600 bg-white border border-slate-100 p-1 rounded-md shadow-sm">
                  <span>Rahul Sharma</span>
                  <span className="text-[7px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">Cleared</span>
                </div>
                <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-600 bg-white border border-slate-100 p-1 rounded-md shadow-sm">
                  <span>Priya Singh</span>
                  <span className="text-[7px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded">₹1,250</span>
                </div>
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 mt-1.5 flex justify-between text-[7.5px] font-bold text-slate-400">
              <span>Outstanding Dues</span>
              <span className="text-slate-700 font-extrabold">₹{(metrics.total_bills * 150).toLocaleString()}</span>
            </div>

            {/* Hover Tooltip */}
            {hoveredCard === 'ledger' && (
              <div className="absolute z-10 bottom-full left-0 mb-2 w-44 bg-slate-800 text-white text-[9px] font-semibold p-2 rounded-xl shadow-lg border border-slate-700/50 leading-relaxed animate-fade-in">
                Automatically track credit, dues, and payments.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Charts & Activity Log Grid */}
        <div className="grid grid-cols-3 gap-2 flex-shrink-0">
          {/* Sales Sparkline bar */}
          <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col justify-between hover:bg-white hover:border-slate-200/60 transition-all duration-300">
            <h5 className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-wide">Sales Today: ₹45,210</h5>
            <div className="h-8 flex items-end gap-1 mt-1 px-1">
              {[25, 45, 15, 65, 85, 55].map((h, i) => (
                <div key={i} className="flex-1 bg-primary-100 hover:bg-primary-500 transition-colors rounded-sm relative group" style={{ height: `${h}%` }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[8px] font-bold px-1 rounded">₹{h * 50}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Curve line chart */}
          <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col justify-between hover:bg-white hover:border-slate-200/60 transition-all duration-300">
            <h5 className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-wide">Sales Growth</h5>
            <div className="h-8 mt-1">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d="M 0 25 Q 25 5, 50 15 T 100 8" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 0 25 Q 25 5, 50 15 T 100 8 L 100 30 L 0 30 Z" fill="rgba(37, 99, 235, 0.08)" />
              </svg>
            </div>
          </div>

          {/* Live Activity Log */}
          <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl overflow-hidden flex flex-col justify-between hover:bg-white hover:border-slate-200/60 transition-all duration-300">
            <h5 className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-wide">Live Activity Log</h5>
            <div className="space-y-0.5 mt-1">
              {activeLog.slice(0, 2).map(log => (
                <div key={log.id} className="text-[7px] font-bold text-slate-600 bg-white border border-slate-100 px-1 py-0.2 rounded truncate animate-fade-in flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${log.type === 'invoice' ? 'bg-emerald-500' : log.type === 'stock' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Glowing Feature Tags */}
      <div className="w-[105px] flex flex-col gap-1.5 justify-center flex-shrink-0">
        {[
          { label: "⚡ FAST BILLING", border: "border-emerald-500", glow: "shadow-[0_0_6px_rgba(16,185,129,0.25)]", bg: "bg-emerald-50 text-emerald-700" },
          { label: "📦 AUTO-INVENTORY", border: "border-blue-500", glow: "shadow-[0_0_6px_rgba(59,130,246,0.25)]", bg: "bg-blue-50 text-blue-700" },
          { label: "📊 SMART LEDGER", border: "border-purple-500", glow: "shadow-[0_0_6px_rgba(168,85,247,0.25)]", bg: "bg-purple-50 text-purple-700" },
          { label: "🔔 LOW-STOCK ALERTS", border: "border-orange-500", glow: "shadow-[0_0_6px_rgba(249,115,22,0.25)]", bg: "bg-orange-50 text-orange-700" },
          { label: "🔍 ADVANCED SEARCH", border: "border-yellow-500", glow: "shadow-[0_0_6px_rgba(234,179,8,0.25)]", bg: "bg-yellow-50 text-yellow-700" }
        ].map(tag => (
          <div key={tag.label} className={`border text-[7.5px] font-black py-1.5 px-1 rounded-lg text-center tracking-wide transition-all duration-300 hover:scale-105 ${tag.border} ${tag.glow} ${tag.bg}`}>
            {tag.label}
          </div>
        ))}
      </div>
    </div>
  );
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

// ─── OTP Verifier ────────────────────────────────────────────────────────────
// Self-contained inline OTP widget used for email and phone verification

function OtpVerifier({ type, value, isValueValid, onVerified }) {
  const [phase, setPhase] = useState('idle'); // idle | sending | otp_sent | verifying | verified
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const timerRef = useRef(null);
  const { toast } = useToast();

  // Clear state when value changes so user can re-verify new input
  useEffect(() => {
    if (phase !== 'idle') {
      setPhase('idle');
      setOtpInput('');
      setError('');
      setDevOtp('');
      clearInterval(timerRef.current);
    }
  }, [value]);

  const startTimer = () => {
    setSecondsLeft(120);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleSend = async () => {
    if (!isValueValid) return;
    setPhase('sending');
    setError('');
    try {
      const res = await api.sendOtp(type, value);
      const code = res.data.dev_otp || '';
      setDevOtp(code);
      if (code) {
        setOtpInput(code);
        toast(`[DEV TRACKER] OTP: ${code} (Auto-filled)`, 'info');
      } else {
        setOtpInput('');
      }
      setPhase('otp_sent');
      startTimer();
      toast(res.data.message || `OTP sent to your ${type === 'email' ? 'email address' : 'mobile number'}`, 'success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      setPhase('idle');
    }
  };

  const handleVerify = async () => {
    if (!otpInput.trim()) { setError('Please enter the OTP.'); return; }
    if (secondsLeft === 0) { setError('OTP has expired. Please request a new OTP.'); return; }
    setPhase('verifying');
    setError('');
    try {
      await api.verifyOtp(type, value, otpInput.trim());
      clearInterval(timerRef.current);
      setPhase('verified');
      toast(`✅ ${type === 'email' ? 'Email' : 'Mobile number'} verified successfully!`, 'success');
      onVerified();
    } catch (err) {
      setPhase('otp_sent');
      setError(err.response?.data?.message || 'Incorrect OTP. Please try again.');
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (phase === 'verified') {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
          <span className="text-base">✔</span> Verified
        </span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      {/* Verify / Sending button */}
      {phase === 'idle' && (
        <button
          type="button"
          onClick={handleSend}
          disabled={!isValueValid}
          className="text-xs font-bold text-[#2563EB] border border-[#2563EB] px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Verify
        </button>
      )}
      {phase === 'sending' && (
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <span className="spinner w-3 h-3 border-2 border-blue-500 border-t-transparent inline-block rounded-full" />
          Sending OTP...
        </span>
      )}

      {/* OTP input block */}
      {(phase === 'otp_sent' || phase === 'verifying') && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otpInput}
              onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] tracking-[0.15em] sm:tracking-[0.3em] shadow-inner"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={phase === 'verifying' || secondsLeft === 0 || otpInput.length < 6}
              className="px-3 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {phase === 'verifying' ? '...' : 'Submit'}
            </button>
          </div>

          {/* Timer + resend */}
          <div className="flex items-center justify-between">
            {secondsLeft > 0 ? (
              <span className="text-[10px] font-bold text-slate-500">
                OTP expires in{' '}
                <span className={secondsLeft <= 30 ? 'text-red-500' : 'text-slate-700'}>{formatTime(secondsLeft)}</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-red-500">OTP Expired</span>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={secondsLeft > 0}
              className="text-[10px] font-bold text-[#2563EB] disabled:text-slate-400 disabled:cursor-not-allowed hover:underline transition-colors"
            >
              Resend OTP
            </button>
          </div>

          {/* Dev OTP hint */}
          {devOtp && (
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl shadow-sm">
              <span>[DEV TRACKER] OTP: <strong className="tracking-widest text-amber-950 font-black text-xs">{devOtp}</strong></span>
              <button
                type="button"
                onClick={() => setOtpInput(devOtp)}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold underline ml-2"
              >
                Auto-fill
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-[10px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}


export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', password: '', confirm_password: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Dynamic Dashboard Metrics
  const [metrics, setMetrics] = useState({ total_customers: 0, total_bills: 0, live_transactions_today: 0 });

  const fetchMetrics = async () => {
    try {
      const res = await api.getPublicMetrics();
      setMetrics(res.data || { total_customers: 0, total_bills: 0, live_transactions_today: 0 });
    } catch (err) {
      console.error("Failed to fetch public metrics", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // 60 seconds polling
    return () => clearInterval(interval);
  }, []);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState('select_method'); // 'select_method' | 'input_value' | 'verify_otp' | 'reset_password'
  const [forgotMethod, setForgotMethod] = useState('email'); // 'email' | 'phone'
  const [forgotValue, setForgotValue] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState('');
  const [forgotErrors, setForgotErrors] = useState({});
  const [forgotTouched, setForgotTouched] = useState({});
  const [forgotTimer, setForgotTimer] = useState(0);

  const forgotTimerRef = useRef(null);

  const startForgotTimer = () => {
    setForgotTimer(300); // 5 minutes
    clearInterval(forgotTimerRef.current);
    forgotTimerRef.current = setInterval(() => {
      setForgotTimer(t => {
        if (t <= 1) {
          clearInterval(forgotTimerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(forgotTimerRef.current);
  }, []);

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
          // Normalize Indian phone: strip non-digits, leading +91 or 0
          let digits = value.replace(/\D/g, '');
          if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
          if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
          digits = digits.slice(0, 10);
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
    let digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    digits = digits.slice(0, 10);
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
      if (!emailVerified) {
        toast('Please verify your email address before creating your account.', 'error');
        setLoading(false);
        return;
      }
      if (!phoneVerified) {
        toast('Please verify your mobile number before creating your account.', 'error');
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
    setEmailVerified(false);
    setPhoneVerified(false);
    
    // Clear forgot password states
    setForgotStep('select_method');
    setForgotMethod('email');
    setForgotValue('');
    setForgotOtp('');
    setForgotPassword('');
    setForgotConfirmPassword('');
    setForgotDevOtp('');
    setForgotErrors({});
    setForgotTouched({});
    setForgotTimer(0);
    clearInterval(forgotTimerRef.current);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#F8FAFC] flex flex-col lg:flex-row font-sans">
      
      {/* Left Column: Branding Section (45% width on desktop) */}
      <div className="w-full lg:w-[45%] lg:h-full bg-slate-50 p-5 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/60 flex-shrink-0 lg:overflow-y-auto">
        
        {/* Top brand header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
            SQ
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">ShopIQ</span>
        </div>

        {/* Center branding text & features */}
        <div className="my-5 lg:my-auto space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Smart POS &amp; Analytics for Retail Businesses
            </h1>
            <p className="text-xs lg:text-sm font-semibold text-slate-500">
              Run your counter speed-optimized, manage real-time inventory, and track metrics on one clean platform.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 sm:gap-2">
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

          {/* High-Fidelity Dashboard Mockup (Live Showcase) */}
          <div className="mt-4 hidden lg:block">
            <LiveShowcase metrics={metrics} />
          </div>
        </div>

        {/* Bottom copyright/footer info */}
        <div className="text-[10px] font-semibold text-slate-400 pt-3">
          © {new Date().getFullYear()} ShopIQ Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Authentication Form (55% width on desktop) */}
      <div className="w-full lg:w-[55%] lg:h-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-10 lg:overflow-y-auto">
        <div className="w-full max-w-[440px] bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.015)] my-auto">
          {mode === 'forgot_password' ? (
            <div>
              {/* Form Header */}
              <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                  Reset Password
                </h2>
                <p className="text-xs lg:text-sm font-semibold text-slate-500 mt-1">
                  {forgotStep === 'select_method' && 'Choose a verification method to prove account ownership.'}
                  {forgotStep === 'input_value' && `Enter your registered ${forgotMethod === 'email' ? 'email address' : 'mobile number'}.`}
                  {forgotStep === 'verify_otp' && `Verify the code sent to your registered ${forgotMethod === 'email' ? 'email' : 'mobile number'}.`}
                  {forgotStep === 'reset_password' && 'Enter your new secure password.'}
                </p>
              </div>

              {forgotStep === 'select_method' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => { setForgotMethod('phone'); setForgotStep('input_value'); setForgotValue(''); setForgotErrors({}); setForgotTouched({}); }}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3.5 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg">📱</span> Reset via Mobile Number
                    </span>
                    <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotMethod('email'); setForgotStep('input_value'); setForgotValue(''); setForgotErrors({}); setForgotTouched({}); }}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3.5 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg">✉</span> Reset via Email Address
                    </span>
                    <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                </div>
              )}

              {forgotStep === 'input_value' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {forgotMethod === 'email' ? 'Email Address' : 'Mobile Number'} *
                    </label>
                    <input
                      className={inputCls(forgotTouched.value && forgotErrors.value)}
                      type={forgotMethod === 'email' ? 'email' : 'text'}
                      placeholder={forgotMethod === 'email' ? 'owner@myshop.com' : '9876543210'}
                      value={forgotValue}
                      onChange={e => {
                        let val = e.target.value;
                        if (forgotMethod === 'phone') {
                          val = val.replace(/\D/g, '').slice(0, 10);
                        }
                        setForgotValue(val);
                        setForgotTouched(prev => ({ ...prev, value: true }));
                        const err = forgotMethod === 'email' ? validateForgotEmail(val) : validateForgotPhone(val);
                        setForgotErrors(prev => ({ ...prev, value: err }));
                      }}
                      autoFocus
                    />
                    {forgotTouched.value && forgotErrors.value && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{forgotErrors.value}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const err = forgotMethod === 'email' ? validateForgotEmail(forgotValue) : validateForgotPhone(forgotValue);
                      if (err) {
                        setForgotErrors({ value: err });
                        setForgotTouched({ value: true });
                        return;
                      }
                      setLoading(true);
                      try {
                        const res = await api.sendForgotPasswordOtp(forgotMethod, forgotValue);
                        const code = res.data.dev_otp || '';
                        setForgotDevOtp(code);
                        if (code) {
                          setForgotOtp(code);
                          toast(`[DEV TRACKER] OTP: ${code} (Auto-filled)`, 'info');
                        } else {
                          setForgotOtp('');
                        }
                        toast('If this account exists, an OTP has been sent.', 'success');
                        startForgotTimer();
                        setForgotStep('verify_otp');
                      } catch (err) {
                        toast(err.response?.data?.message || 'Failed to request OTP.', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || (forgotMethod === 'email' ? validateForgotEmail(forgotValue) : validateForgotPhone(forgotValue))}
                    className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              )}

              {forgotStep === 'verify_otp' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="••••••"
                      value={forgotOtp}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setForgotOtp(val);
                        setForgotTouched(prev => ({ ...prev, otp: true }));
                        const err = val.length === 6 ? '' : 'Please enter the 6-digit OTP.';
                        setForgotErrors(prev => ({ ...prev, otp: err }));
                      }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] tracking-[0.3em] shadow-inner text-center"
                      autoFocus
                    />
                    {forgotTouched.otp && forgotErrors.otp && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 text-center">{forgotErrors.otp}</p>
                    )}
                  </div>

                  {/* Timer + Resend */}
                  <div className="flex items-center justify-between text-xs px-1">
                    {forgotTimer > 0 ? (
                      <span className="text-[10px] font-bold text-slate-500">
                        Expires in <span className="text-red-500">{Math.floor(forgotTimer / 60)}:{String(forgotTimer % 60).padStart(2, '0')}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500">OTP Expired</span>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await api.sendForgotPasswordOtp(forgotMethod, forgotValue);
                          const code = res.data.dev_otp || '';
                          setForgotDevOtp(code);
                          if (code) {
                            setForgotOtp(code);
                            toast(`[DEV TRACKER] OTP: ${code} (Auto-filled)`, 'info');
                          }
                          toast('If this account exists, an OTP has been sent.', 'success');
                          startForgotTimer();
                        } catch {
                          toast('Failed to resend OTP.', 'error');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={forgotTimer > 0 || loading}
                      className="text-[10px] font-bold text-[#2563EB] hover:underline disabled:text-slate-400 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      Resend OTP
                    </button>
                  </div>

                  {/* Dev OTP Box */}
                  {forgotDevOtp && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl shadow-sm">
                      <span>[DEV TRACKER] OTP: <strong className="tracking-widest text-amber-950 font-black text-xs">{forgotDevOtp}</strong></span>
                      <button
                        type="button"
                        onClick={() => setForgotOtp(forgotDevOtp)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold underline ml-2"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (forgotOtp.length < 6) return;
                      setLoading(true);
                      try {
                        await api.verifyForgotPasswordOtp(forgotMethod, forgotValue, forgotOtp);
                        toast('OTP verified successfully.', 'success');
                        setForgotStep('reset_password');
                        setForgotPassword('');
                        setForgotConfirmPassword('');
                        setForgotErrors({});
                        setForgotTouched({});
                      } catch (err) {
                        toast(err.response?.data?.message || 'Incorrect or expired OTP.', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || forgotOtp.length < 6}
                    className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}

              {forgotStep === 'reset_password' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Password *</label>
                    <input
                      className={inputCls(forgotTouched.password && forgotErrors.password)}
                      type="password"
                      placeholder="••••••••"
                      value={forgotPassword}
                      onChange={e => {
                        const val = e.target.value;
                        setForgotPassword(val);
                        setForgotTouched(prev => ({ ...prev, password: true }));
                        setForgotErrors(prev => ({ ...prev, password: validateForgotNewPassword(val) }));
                      }}
                      autoFocus
                    />
                    {forgotTouched.password && forgotErrors.password && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{forgotErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password *</label>
                    <input
                      className={inputCls(forgotTouched.confirmPassword && forgotErrors.confirmPassword)}
                      type="password"
                      placeholder="••••••••"
                      value={forgotConfirmPassword}
                      onChange={e => {
                        const val = e.target.value;
                        setForgotConfirmPassword(val);
                        setForgotTouched(prev => ({ ...prev, confirmPassword: true }));
                        setForgotErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(forgotPassword, val) }));
                      }}
                    />
                    {forgotTouched.confirmPassword && forgotErrors.confirmPassword && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{forgotErrors.confirmPassword}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const passErr = validateForgotNewPassword(forgotPassword);
                      const confErr = validateConfirmPassword(forgotPassword, forgotConfirmPassword);
                      if (passErr || confErr) {
                        setForgotErrors({ password: passErr, confirmPassword: confErr });
                        setForgotTouched({ password: true, confirmPassword: true });
                        return;
                      }
                      setLoading(true);
                      try {
                        await api.resetForgotPassword(forgotMethod, forgotValue, forgotOtp, forgotPassword);
                        toast('Password updated successfully!', 'success');
                        switchMode('login');
                      } catch (err) {
                        toast(err.response?.data?.message || 'Failed to update password.', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !forgotPassword || !forgotConfirmPassword || forgotErrors.password || forgotErrors.confirmPassword}
                    className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              )}

              {/* Back to Sign In Link */}
              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
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
                          onChange={e => { handlePhoneChange(e.target.value); setPhoneVerified(false); }}
                          onBlur={() => handleBlur('phone')}
                        />
                        <FieldError msg={touched.phone && errors.phone} />
                        {!errors.phone && form.phone.length === 10 && (
                          <OtpVerifier
                            type="phone"
                            value={form.phone}
                            isValueValid={!validatePhone(form.phone)}
                            onVerified={() => setPhoneVerified(true)}
                          />
                        )}
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
                      onChange={e => { handleChange('email', e.target.value); setEmailVerified(false); }}
                      onBlur={() => mode === 'signup' && handleBlur('email')}
                      required
                    />
                    {mode === 'signup' && <FieldError msg={touched.email && errors.email} />}
                    {mode === 'signup' && !errors.email && form.email && (
                      <OtpVerifier
                        type="email"
                        value={form.email}
                        isValueValid={!validateEmail(form.email)}
                        onVerified={() => setEmailVerified(true)}
                      />
                    )}
                  </div>
                  
                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password *</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot_password');
                            setForgotStep('select_method');
                            setForgotValue('');
                            setForgotOtp('');
                            setForgotPassword('');
                            setForgotConfirmPassword('');
                            setForgotDevOtp('');
                            setForgotErrors({});
                            setForgotTouched({});
                          }}
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
                        onChange={e => { handleChange('confirm_password', e.target.value) }}
                        onBlur={() => handleBlur('confirm_password')}
                        required
                      />
                      <FieldError msg={touched.confirm_password && errors.confirm_password} />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (mode === 'signup' && (!emailVerified || !phoneVerified))}
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
            </>
          )}
        </div>
      </div>
      
    </div>
  );
}
