import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { ModalShell, ModalHeader } from '../ui/Modal'
import { inputCls } from '../../utils/styles'
import { Cloud, Eye, EyeOff, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react'

export default function SyncModal({ onClose }) {
  const { isSyncEnabled, syncStatus, syncedAt, syncGistId, connectSync, disconnectSync, syncNow } = usePortfolio()
  const [tokenInput, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConnect = async () => {
    if (!tokenInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      await connectSync(tokenInput.trim())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const syncTime = syncedAt
    ? new Date(syncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <ModalShell className="max-w-md">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cloud Sync</h2>
        </div>
      </ModalHeader>

      <div className="p-5 space-y-4">
        {!isSyncEnabled ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ซิงค์ข้อมูลพอร์ตข้าม PC / iPhone / Tablet อัตโนมัติ ผ่าน GitHub Gist (ฟรี ไม่ต้องสมัครเพิ่ม)
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-medium text-slate-700 dark:text-slate-200">วิธีสร้าง Token:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                <li>
                  ไปที่{' '}
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    github.com/settings/tokens/new <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>ตั้งชื่อ เช่น "Portfolio Sync"</li>
                <li>
                  เลือก scope:{' '}
                  <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">gist</code>
                </li>
                <li>กด Generate token แล้วคัดลอกมาใส่ด้านล่าง</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className={`${inputCls} pr-10 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleConnect}
              disabled={!tokenInput.trim() || loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> กำลังเชื่อมต่อ...</>
                : 'Connect'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-4">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">เชื่อมต่อแล้ว</p>
                {syncGistId && (
                  <a
                    href={`https://gist.github.com/${syncGistId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    Gist: {syncGistId.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {syncStatus === 'syncing'
                  ? 'กำลังซิงค์...'
                  : syncStatus === 'synced' && syncTime
                    ? `ซิงค์ล่าสุด ${syncTime} น.`
                    : syncStatus === 'error'
                      ? 'ซิงค์ไม่สำเร็จ'
                      : 'พร้อมซิงค์'}
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : syncStatus === 'syncing'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                {syncStatus === 'synced' ? '● Synced' : syncStatus === 'syncing' ? 'Syncing' : '● Error'}
              </span>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              ข้อมูลจะ sync อัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง
              เมื่อเปิดแอปบนอุปกรณ์อื่น จะโหลดข้อมูลล่าสุดจาก Cloud ให้อัตโนมัติ
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={syncNow}
                disabled={syncStatus === 'syncing'}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
              <button
                onClick={disconnectSync}
                className="flex-1 py-2.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}
