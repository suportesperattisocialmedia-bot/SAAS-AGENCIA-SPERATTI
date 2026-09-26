import React, { useEffect, useState } from 'react';
import { notificationService } from '../../services/notificationService';
import { NotificationType } from '../../types';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';

interface ToastItem {
  id: string;
  message: string;
  type: NotificationType;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = notificationService.subscribeToast(({ message, type }) => {
      const id = `toast-${generateUUID()}`;
      setToasts(prev => [...prev, { id, message, type }].slice(-3));

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    });

    return unsub;
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div role="region" aria-label="Avisos" aria-live="polite" className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-neutral-900 border border-neutral-700 text-neutral-100 px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2.5">
            {getIcon(toast.type)}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Fechar aviso"
            className="text-neutral-400 hover:text-neutral-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
