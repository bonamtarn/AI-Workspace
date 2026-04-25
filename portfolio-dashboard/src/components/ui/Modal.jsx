import { X } from 'lucide-react'

export function ModalShell({ children, className = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full shadow-xl ${className}`}>
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ onClose, className = '', children }) {
  return (
    <div className={`flex items-center justify-between p-5 pb-4 border-b border-slate-100 dark:border-slate-800 ${className}`}>
      {children}
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0 ml-3">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
