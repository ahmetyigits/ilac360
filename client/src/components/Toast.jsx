import { X, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';

const typeConfig = {
  error: { icon: AlertCircle, bg: 'bg-red-50 border-red-200 dark-toast-error', text: 'text-red-800 dark:text-red-300', iconColor: 'text-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200 dark-toast-warning', text: 'text-amber-800 dark:text-amber-300', iconColor: 'text-amber-500' },
  success: { icon: CheckCircle, bg: 'bg-emerald-50 border-emerald-200 dark-toast-success', text: 'text-emerald-800 dark:text-emerald-300', iconColor: 'text-emerald-500' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200 dark-toast-info', text: 'text-blue-800 dark:text-blue-300', iconColor: 'text-blue-500' },
};

export default function Toast({ message, type = 'info', onClose }) {
  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className={`max-w-sm rounded-xl border px-4 py-3 shadow-lg animate-toast-in ${config.bg}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.iconColor}`} />
        <p className={`text-[13px] leading-relaxed flex-1 ${config.text}`}>{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className={`w-3.5 h-3.5 ${config.text}`} />
        </button>
      </div>
    </div>
  );
}
