import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed top-5 end-5 z-[100000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
            role="region"
            aria-live="polite"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-3 ${
                  toast.type === "success"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30"
                    : toast.type === "error"
                    ? "bg-rose-600 text-white border-rose-500 shadow-rose-900/30"
                    : "bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />}
                  {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />}
                  {toast.type === "info" && <Info className="w-5 h-5 text-indigo-200 shrink-0" />}
                  <span className="text-sm font-semibold leading-snug">{toast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close"
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 ms-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
