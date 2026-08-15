import { useCallback, useRef, useState, type ReactNode } from "react";
import { ToastContext, ToastListContext, type ToastApi, type ToastItem, type ToastVariant } from "./toast-store";

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = ++idRef.current;
      setToasts((current) => [...current, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  return (
    <ToastContext.Provider value={api}>
      <ToastListContext.Provider value={{ toasts, dismiss }}>
        {children}
      </ToastListContext.Provider>
    </ToastContext.Provider>
  );
}
