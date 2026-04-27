import { useRef } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { STORAGE_KEY } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'
import { RefreshCw, PlusCircle, Clock, Download, Upload, Sun, Moon, Wallet, Menu } from 'lucide-react'

function exportData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const blob = new Blob([raw], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Header({ onAddAsset, onImportWallet, onToggleSidebar }) {
  const { activePortfolio, lastUpdated, isRefreshing, refreshPrices, usdToThb } = usePortfolio()
  const { isDark, toggleTheme } = useTheme()
  const fileRef = useRef(null)

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.portfolios) throw new Error('invalid')
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        window.location.reload()
      } catch {
        alert('Invalid file. Please use a file exported from Portfolio Dashboard.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const btnCls = 'flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onToggleSidebar} className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{activePortfolio?.name}</h1>
            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-transparent whitespace-nowrap">
              USD/THB ≈ {usdToThb.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · auto-refresh every 60s`
                : 'Loading prices...'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button onClick={exportData} title="Export portfolio data" className={btnCls}>
          <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
        </button>
        <button onClick={() => fileRef.current?.click()} title="Import portfolio data" className={btnCls}>
          <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import</span>
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

        <button onClick={onImportWallet} title="Import holdings from wallet address" className={btnCls}>
          <Wallet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Wallet</span>
        </button>

        <button onClick={refreshPrices} disabled={isRefreshing} className={`${btnCls} disabled:opacity-40`} title="Refresh prices">
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`${btnCls} px-2`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>

        <button onClick={onAddAsset}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all font-medium border border-blue-700">
          <PlusCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Asset</span>
        </button>
      </div>
    </div>
  )
}
