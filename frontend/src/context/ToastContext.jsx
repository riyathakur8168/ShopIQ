import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const colors = {
    success: 'border-l-4 border-success-500 bg-surface-card',
    error:   'border-l-4 border-red-500 bg-surface-card',
    warning: 'border-l-4 border-warning-400 bg-surface-card',
    info:    'border-l-4 border-primary-500 bg-surface-card',
  };

  const iconColors = {
    success: 'text-success-400',
    error:   'text-red-400',
    warning: 'text-warning-400',
    info:    'text-primary-400',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 min-w-[300px]">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-card animate-fade-in ${colors[t.type]}`}>
            <span className={`text-lg font-bold flex-shrink-0 mt-0.5 ${iconColors[t.type]}`}>{icons[t.type]}</span>
            <p className="text-sm text-slate-200 font-medium">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
