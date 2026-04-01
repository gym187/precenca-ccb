import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

const icons = {
  success: <CheckCircle size={18} className="text-emerald-600 shrink-0" />,
  error: <XCircle size={18} className="text-red-500 shrink-0" />,
  info: <Info size={18} className="text-blue-500 shrink-0" />,
}

const styles = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error: 'border-l-4 border-red-500 bg-white',
  info: 'border-l-4 border-blue-400 bg-white',
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border border-stone-200 ${styles[t.type]} animate-fade-in`}
        >
          {icons[t.type]}
          <span className="text-sm text-stone-700 flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-stone-400 hover:text-stone-600 transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
