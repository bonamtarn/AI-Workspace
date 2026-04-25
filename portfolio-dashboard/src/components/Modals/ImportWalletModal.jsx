import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { COINGECKO_IDS } from '../../utils/assetConfig'
import { formatTHB, formatNumber } from '../../utils/formatters'
import { fetchBTCWallet, fetchETHWallet, fetchSOLWallet } from '../../services/walletService'
import { ModalShell, ModalHeader } from '../ui/Modal'
import { inputCls } from '../../utils/styles'
import { Wallet, Loader2, AlertCircle, Search, CheckSquare, Square } from 'lucide-react'

const CHAINS = [
  {
    id: 'BTC',
    label: 'Bitcoin',
    color: '#f59e0b',
    placeholder: 'xpub / ypub / zpub  หรือ  bc1q… / 1… / 3…',
    inputLabel: 'xpub / zpub หรือ Bitcoin Address',
    hint: 'ใส่ Extended Public Key (xpub/ypub/zpub) เพื่อดู balance รวมทุก address ในกระเป๋า · หรือจะใส่ address เดี่ยว (bc1q… / 1… / 3…) ก็ได้',
  },
  {
    id: 'ETH',
    label: 'Ethereum',
    color: '#6366f1',
    placeholder: '0x…',
    inputLabel: 'Wallet Address',
    hint: 'Ethereum address — ดึง ETH + ERC-20 tokens ทั้งหมดในที่เดียว',
  },
  {
    id: 'SOL',
    label: 'Solana',
    color: '#22c55e',
    placeholder: 'Wallet address (Base58) เช่น 7xKX…',
    inputLabel: 'Wallet Address',
    hint: 'Solana wallet address — ดึง SOL + SPL tokens ทั้งหมดในที่เดียว (ใส่ address เหมือน ETH ไม่ต้องใช้ xpub)',
  },
]

export default function ImportWalletModal({ onClose }) {
  const { activePortfolio, dispatch, getAssetPriceTHB } = usePortfolio()
  const [chain, setChain] = useState('BTC')
  const [address, setAddress] = useState('')
  const [subLabel, setSubLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState({})

  const chainCfg = CHAINS.find(c => c.id === chain)

  const switchChain = (c) => {
    setChain(c)
    setAddress('')
    setError(null)
    setResults(null)
    setSelected({})
  }

  const scan = async () => {
    const addr = address.trim()
    if (!addr) return
    setLoading(true)
    setError(null)
    setResults(null)
    setSelected({})
    try {
      let assets
      if (chain === 'BTC')      assets = await fetchBTCWallet(addr)
      else if (chain === 'ETH') assets = await fetchETHWallet(addr)
      else                      assets = await fetchSOLWallet(addr)

      if (!assets.length) {
        setError('No token holdings found at this address.')
      } else {
        setResults(assets)
        const sel = {}
        assets.forEach((_, i) => { sel[i] = true })
        setSelected(sel)
      }
    } catch (e) {
      setError(e.message || 'Failed to fetch wallet. Please check the address and try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleAll = () => {
    const allOn = results.every((_, i) => selected[i])
    const sel = {}
    results.forEach((_, i) => { sel[i] = !allOn })
    setSelected(sel)
  }

  const selectedCount = results ? results.filter((_, i) => selected[i]).length : 0
  const getPrice = (item) => getAssetPriceTHB({ symbol: item.symbol, type: 'crypto' })

  const addSelected = () => {
    if (!results || selectedCount === 0) return
    const label = subLabel.trim() || `${chain}: ${address.trim().slice(0, 6)}…${address.trim().slice(-4)}`
    results.forEach((item, i) => {
      if (!selected[i]) return
      const currentPrice = getPrice(item)
      dispatch({
        type: 'ADD_ASSET',
        payload: {
          portfolioId: activePortfolio.id,
          asset: {
            id: `a-${Date.now()}-${i}`,
            symbol: item.symbol.toUpperCase(),
            name: item.name,
            type: 'crypto',
            quantity: item.quantity,
            avgCostTHB: currentPrice ?? 0,
            subPortfolio: label,
          },
        },
      })
    })
    onClose()
  }

  const hasPriceData = (symbol) => !!COINGECKO_IDS[symbol.toUpperCase()]

  return (
    <ModalShell className="max-w-lg flex flex-col max-h-[90vh]">
      <ModalHeader onClose={onClose} className="shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Import from Wallet</h2>
        </div>
      </ModalHeader>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Chain selector */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Blockchain</label>
          <div className="grid grid-cols-3 gap-2">
            {CHAINS.map(c => (
              <button key={c.id} type="button" onClick={() => switchChain(c.id)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${chain === c.id
                  ? 'border-transparent text-white shadow-md'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                style={chain === c.id ? { background: c.color } : {}}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Address input */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">{chainCfg.inputLabel}</label>
          <div className="flex gap-2">
            <input
              value={address}
              onChange={e => { setAddress(e.target.value); setError(null); setResults(null) }}
              onKeyDown={e => e.key === 'Enter' && scan()}
              placeholder={chainCfg.placeholder}
              className={`${inputCls} font-mono text-xs`}
            />
            <button type="button" onClick={scan} disabled={!address.trim() || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all disabled:opacity-40 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Scan
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">{chainCfg.hint}</p>
        </div>

        {/* Sub-portfolio label */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            Sub-Portfolio Label <span className="text-slate-300 dark:text-slate-600">(optional)</span>
          </label>
          <input value={subLabel} onChange={e => setSubLabel(e.target.value)}
            placeholder={`${chain} Cold Wallet, Binance Wallet, ...`} className={inputCls} />
          <p className="text-xs text-slate-400 mt-1">Defaults to shortened address if left blank</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Found {results.length} token{results.length > 1 ? 's' : ''}
              </span>
              <button type="button" onClick={toggleAll}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                {results.every((_, i) => selected[i])
                  ? <><CheckSquare className="w-3.5 h-3.5" /> Deselect all</>
                  : <><Square className="w-3.5 h-3.5" /> Select all</>}
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((item, i) => {
                  const price = getPrice(item)
                  const value = price ? price * item.quantity : null
                  return (
                    <label key={i}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                      <input type="checkbox" checked={!!selected[i]}
                        onChange={e => setSelected(prev => ({ ...prev, [i]: e.target.checked }))}
                        className="w-4 h-4 accent-blue-500 shrink-0" />
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{item.symbol}</div>
                        <div className="text-xs text-slate-400 truncate">{item.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatNumber(item.quantity)}</div>
                        <div className="text-xs">
                          {value != null
                            ? <span className="text-slate-500 dark:text-slate-400">{formatTHB(value)}</span>
                            : <span className="text-slate-300 dark:text-slate-600">{hasPriceData(item.symbol) ? 'Loading…' : 'No price'}</span>}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Cost basis will be set to current market price where available (฿0 if unknown). Add transactions later to update.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-5 pt-0 shrink-0">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:text-white transition-colors">
          Cancel
        </button>
        <button type="button" onClick={addSelected} disabled={selectedCount === 0}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-40">
          {selectedCount > 0 ? `Add ${selectedCount} asset${selectedCount > 1 ? 's' : ''} to Portfolio` : 'Add to Portfolio'}
        </button>
      </div>
    </ModalShell>
  )
}
