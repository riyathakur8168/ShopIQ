import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const icons = {
    success: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const iconBgColors = {
    success: 'bg-emerald-50 border border-emerald-100',
    error:   'bg-rose-50 border border-rose-100',
    warning: 'bg-amber-50 border border-amber-100',
    info:    'bg-blue-50 border border-blue-100',
  };

  const titleColors = {
    success: 'text-emerald-800',
    error:   'text-rose-800',
    warning: 'text-amber-800',
    info:    'text-blue-800',
  };

  const borderColors = {
    success: 'border-l-4 border-emerald-500',
    error:   'border-l-4 border-rose-500',
    warning: 'border-l-4 border-amber-500',
    info:    'border-l-4 border-blue-500',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 min-w-[320px] max-w-[400px]">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3.5 p-4 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 animate-toast-in ${borderColors[t.type]}`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${iconBgColors[t.type]}`}>
              {icons[t.type]}
            </div>
            <div className="flex-1 pt-0.5">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${titleColors[t.type]}`}>
                {t.type}
              </h4>
              <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors flex-shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
