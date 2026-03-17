import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
};

function showToast(type: ToastType, options?: ToastOptions) {
  return sonnerToast.custom(
    (id) => (
      <div className="flex items-start gap-3 rounded-lg border border-[var(--chip-line)] bg-white p-4 shadow-lg dark:bg-[var(--chip-bg)]">
        <div className="flex-shrink-0">{toastIcons[type]}</div>
        <div className="flex-1 space-y-1">
          {options?.title && (
            <p className="text-sm font-medium text-[var(--sea-ink)]">{options.title}</p>
          )}
          {options?.description && (
            <p className="text-sm text-[var(--sea-ink-soft)]">{options.description}</p>
          )}
        </div>
        <button
          onClick={() => sonnerToast.dismiss(id)}
          className="flex-shrink-0 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    {
      duration: options?.duration ?? 3000,
    },
  );
}

export const toast = {
  success: (options?: ToastOptions) => showToast("success", options),
  error: (options?: ToastOptions) => showToast("error", options),
  info: (options?: ToastOptions) => showToast("info", options),
  warning: (options?: ToastOptions) => showToast("warning", options),
};

export function Toaster() {
  return <SonnerToaster position="top-right" />;
}
