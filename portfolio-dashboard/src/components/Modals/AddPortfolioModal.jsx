import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { ModalShell } from '../ui/Modal'
import { inputCls } from '../../utils/styles'
import { X } from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#f97316']

export default function AddPortfolioModal({ onClose }) {
  const { dispatch } = usePortfolio()
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'ADD_PORTFOLIO', payload: { id: `p-${Date.now()}`, name: name.trim(), owner: owner.trim() || name.trim(), color, assets: [] } })
    onClose()
  }

  return (
    <ModalShell className="max-w-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">New Portfolio</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Portfolio Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Main Portfolio, Family" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Owner</label>
          <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Poy, Mom, Dad" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
            Create Portfolio
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
