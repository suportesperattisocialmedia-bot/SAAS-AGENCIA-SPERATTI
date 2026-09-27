import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { notificationService, type ToastAction } from '../../services/notificationService';
import { NotificationType } from '../../types';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';

interface ToastItem {
  id: string;
  message: string;
  type: NotificationType;
  action?: ToastAction;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const unsub = notificationService.subscribeToast(({ message, type, action }) => {
      const id = `toast-${generateUUID()}`;
      setToasts(prev => [...prev, { id, message, type, action }].slice(-3));

      // Avisos com ação (ex.: Desfazer) ficam um pouco mais na tela.
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, action ? 7000 : 4000);
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

  return (
    <div role="region" aria-label="Avisos" aria-live="polite" className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout={!reduce}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto bg-[#161618] border border-white/[0.1] text-neutral-100 px-4 py-3 rounded-[24px] shadow-2xl flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5">
              {getIcon(toast.type)}
              <span>{toast.message}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="rounded-full bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-950 transition-transform hover:bg-white active:scale-95"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar aviso"
                className="text-neutral-400 hover:text-neutral-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
