import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let _addToast: ((msg: string, type: ToastType) => void) | null = null;

export function registerToast(fn: (msg: string, type: ToastType) => void) {
  _addToast = fn;
}

export function toast(message: string, type: ToastType = 'info') {
  _addToast?.(message, type);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const add = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  return { toasts, add };
}

export function ToastContainer({ toasts }: { toasts: Array<{ id: number; message: string; type: ToastType }> }) {
  const icons: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
