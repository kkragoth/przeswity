import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ToastKind = 'info' | 'success' | 'error'

interface Toast {
  id: string
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const show = useCallback((message: string, kind: ToastKind = 'info') => {
        const id = Math.random().toString(36).slice(2, 10);
        setToasts((t) => [...t, { id, kind, message }]);
        window.setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <div className="toast-host" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.kind}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        return { show: (m) => console.log('[toast]', m) };
    }
    return ctx;
}
