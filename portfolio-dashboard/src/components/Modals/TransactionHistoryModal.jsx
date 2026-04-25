import { usePortfolio } from '../../context/PortfolioContext'
import { getAssetStats } from '../../utils/assetUtils'
import { ASSET_TYPES } from '../../utils/assetConfig'
import { formatTHB, formatNumber } from '../../utils/formatters'
import { ModalShell } from '../ui/Modal'
import { X, Trash2, TrendingUp, TrendingDown, PlusCircle } from 'lucide-react'

function buildTxContext(transactions) {
  const chrono = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
  let runQty = 0, runCost = 0
  const map = {}
  for (const tx of chrono) {
    let pnl = null
    if (tx.type === 'buy') {
      runCost += tx.quantity * tx.pricePerUnit
      runQty  += tx.quantity
    } else {
      const avg = runQty > 0 ? runCost / runQty : 0
      pnl = tx.quantity * (tx.pricePerUnit - avg)
      if (runQty > 0) runCost *= (runQty - tx.quantity) / runQty
      runQty = Math.max(0, runQty - tx.quantity)
    }
    map[tx.id] = { pnl }
  }
  return map
}

export default function TransactionHistoryModal({ asset, onClose, onAddTransaction }) {
  const { activePortfolio, dispatch } = usePortfolio()
  const cfg = ASSET_TYPES[asset.type]
  const stats = getAssetStats(asset)
  const transactions = asset.transactions || []
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const txWithContext = buildTxContext(transactions)

  const handleDelete = (txId) => {
    if (confirm('Delete this transaction?')) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: { portfolioId: activePortfolio.id, assetId: asset.id, txId } })
    }
  }

  const summaryItems = [
    { label: 'Holding',       value: `${formatNumber(stats.quantity)} ${asset.symbol}` },
    { label: 'Avg Cost / Unit', value: formatTHB(stats.avgCostTHB) },
    { label: 'Realized P&L',  value: formatTHB(stats.realizedPnL), color: stats.realizedPnL >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400' },
  ]

  return (
    <ModalShell className="max-w-2xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${cfg?.color}22`, color: cfg?.color }}>
            {asset.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white">{asset.symbol} — Transaction History</div>
            <div className="text-xs text-slate-400">{asset.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddTransaction}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            <PlusCircle className="w-3.5 h-3.5" /> Trade
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 shrink-0">
        {summaryItems.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 px-5 py-3">
            <div className="text-xs text-slate-400 dark:text-slate-500">{s.label}</div>
            <div className={`text-sm font-semibold mt-0.5 ${s.color || 'text-slate-900 dark:text-white'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">No transactions yet</p>
            <button onClick={onAddTransaction} className="mt-4 text-xs text-blue-500 hover:text-blue-400 underline underline-offset-2">
              Add first transaction
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <tr className="text-xs text-slate-400 uppercase tracking-wider">
                {['Date', 'Type', 'Qty', 'Price / Unit', 'Total', 'P&L', 'Note', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sorted.map(tx => {
                const isBuy = tx.type === 'buy'
                const pnl = txWithContext[tx.id]?.pnl
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isBuy ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                        {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isBuy ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{formatNumber(tx.quantity)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatTHB(tx.pricePerUnit)}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{formatTHB(tx.quantity * tx.pricePerUnit)}</td>
                    <td className="px-4 py-3">
                      {!isBuy && pnl !== null
                        ? <span className={`text-sm font-medium ${pnl >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{formatTHB(pnl)}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[100px] truncate">{tx.note || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(tx.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 shrink-0">
        {sorted.length} transactions · Cost method: Weighted Average (WAVG)
      </div>
    </ModalShell>
  )
}
