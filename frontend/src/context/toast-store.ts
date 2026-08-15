import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
};

export type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);
export const ToastListContext = createContext<{
  toasts: ToastItem[];
  dismiss: (id: number) => void;
} | null>(null);
