import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { getAssetStats } from '../../utils/assetUtils'
import { ASSET_TYPES } from '../../utils/assetConfig'
import { formatTHB, formatUSD, formatPercent, formatNumber } from '../../utils/formatters'
import { Edit2, Trash2, TrendingUp, TrendingDown, PlusCircle, History, ChevronDown, ChevronRight } from 'lucide-react'

export default function AssetTable({ onEditAsset, onAddTransaction, onViewHistory }) {
  const { activePortfolio, dispatch, getAssetPriceTHB, get24hChange, usdToThb } = usePortfolio()
  const [expanded, setExpanded] = useState({})

  if (!activePortfolio) return null

  const rows = activePortfolio.assets.map(a => {
    const stats = getAssetStats(a)
    const price = getAssetPriceTHB(a)
    const cost = stats.avgCostTHB * stats.quantity
    const value = price !== null ? price * stats.quantity : null
    const pnl = value !== null ? value - cost : null
    const pnlPct = pnl !== null && cost > 0 ? (pnl / cost) * 100 : null
    return { ...a, ...stats, price, cost, value, pnl, pnlPct, change24h: get24hChange(a) }
  })

  // Group assets by symbol+type for sub-portfolio display, sorted by type order
  const TYPE_ORDER = Object.keys(ASSET_TYPES)
  const groupKeys = []
  const groups = {}
  rows.forEach(a => {
    const key = `${a.symbol}::${a.type}`
    if (!groups[key]) { groups[key] = []; groupKeys.push(key) }
    groups[key].push(a)
  })
  groupKeys.sort((a, b) => {
    const ta = a.split('::')[1], tb = b.split('::')[1]
    return TYPE_ORDER.indexOf(ta) - TYPE_ORDER.indexOf(tb)
  })

  const handleDelete = (a) => {
    if (confirm(`Remove ${a.symbol} from portfolio?`)) {
      dispatch({ type: 'DELETE_ASSET', payload: { portfolioId: activePortfolio.id, assetId: a.id } })
    }
  }

  const PriceCell = ({ price }) => {
    if (price === null) return <span className="text-slate-300 dark:text-slate-600">—</span>
    return <span className="text-sm font-medium text-slate-900 dark:text-white">{formatUSD(price / usdToThb)}</span>
  }

  const VaultCell = ({ vaults }) => {
    const list = [...new Set((Array.isArray(vaults) ? vaults : [vaults]).filter(Boolean))]
    if (!list.length) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
    return (
      <div className="flex flex-wrap gap-1">
        {list.map(v => (
          <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            {v}
          </span>
        ))}
      </div>
    )
  }

  const ValueCell = ({ thbValue }) => {
    if (thbValue == null) return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-900 dark:text-white">{formatUSD(thbValue / usdToThb)}</span>
        <span className="text-xs text-slate-400">{formatTHB(thbValue)}</span>
      </div>
    )
  }

  const PnL = ({ val, pct }) => {
    if (val === null) return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
    const pos = val >= 0
    const Icon = pos ? TrendingUp : TrendingDown
    return (
      <div className={`flex flex-col ${pos ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
        <div className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <span className="text-sm font-medium">{formatUSD(val / usdToThb)}</span>
        </div>
        <span className="text-xs opacity-75">{formatTHB(val)}</span>
        {pct !== null && <span className="text-xs opacity-75">{formatPercent(pct)}</span>}
      </div>
    )
  }

  const ActionButtons = ({ a }) => {
    const txCount = a.transactions?.length || 0
    return (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onAddTransaction(a)} title="Buy / Sell"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/40 transition-colors">
          <PlusCircle className="w-3 h-3" /> Trade
        </button>
        <button onClick={() => onViewHistory(a)} title="Transaction history"
          className="relative p-1.5 text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors">
          <History className="w-3.5 h-3.5" />
          {txCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
              {txCount > 9 ? '9+' : txCount}
            </span>
          )}
        </button>
        <button onClick={() => onEditAsset(a)} className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Edit">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => handleDelete(a)} className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  // Single asset row (no grouping)
  const renderAssetRow = (a) => {
    const cfg = ASSET_TYPES[a.type]
    return (
      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: `${cfg?.color}22`, color: cfg?.color }}>
              {a.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{a.symbol}</div>
              <div className="text-xs text-slate-400 truncate max-w-[100px]">{a.name}</div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${cfg?.bgColor}`}>
              {cfg?.label}
            </span>
          </div>
        </td>
        <td className="px-4 py-3"><PriceCell price={a.price} /></td>
        <td className="px-4 py-3">
          {a.change24h !== null ? (
            <span className={`font-medium ${a.change24h >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatPercent(a.change24h)}
            </span>
          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
        </td>
        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatNumber(a.quantity)}</td>
        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatTHB(a.avgCostTHB)}</td>
        <td className="px-4 py-3"><ValueCell thbValue={a.value ?? a.cost} /></td>
        <td className="px-4 py-3"><PnL val={a.pnl} pct={a.pnlPct} /></td>
        <td className="px-4 py-3"><VaultCell vaults={a.subPortfolio} /></td>
        <td className="px-4 py-3"><ActionButtons a={a} /></td>
      </tr>
    )
  }

  // Child row inside an expanded group
  const renderChildRow = (a) => {
    const cfg = ASSET_TYPES[a.type]
    return (
      <tr key={`child-${a.id}`} className="bg-slate-50/60 dark:bg-slate-800/20 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors group">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2 pl-7">
            <div className="w-1 h-5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: `${cfg?.color}22`, color: cfg?.color }}>
              {a.symbol.slice(0, 2)}
            </div>
            <div className="font-medium text-slate-700 dark:text-slate-300 text-sm">
              {a.subPortfolio || 'Main'}
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400">{formatNumber(a.quantity)}</td>
        <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400">{formatTHB(a.avgCostTHB)}</td>
        <td className="px-4 py-2.5"><ValueCell thbValue={a.value ?? a.cost} /></td>
        <td className="px-4 py-2.5"><PnL val={a.pnl} pct={a.pnlPct} /></td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5"><ActionButtons a={a} /></td>
      </tr>
    )
  }

  // Aggregate row for a group of same-symbol assets
  const renderGroupRows = (key) => {
    const group = groups[key]
    if (group.length === 1) return renderAssetRow(group[0])

    const isOpen = expanded[key]
    const first = group[0]
    const cfg = ASSET_TYPES[first.type]

    const totalQty = group.reduce((s, a) => s + a.quantity, 0)
    const totalCost = group.reduce((s, a) => s + a.avgCostTHB * a.quantity, 0)
    const avgCostTHB = totalCost / totalQty
    const allHaveValue = group.every(a => a.value !== null)
    const totalValue = allHaveValue ? group.reduce((s, a) => s + a.value, 0) : null
    const totalPnL = allHaveValue ? group.reduce((s, a) => s + a.pnl, 0) : null
    const totalPnLPct = totalPnL !== null && totalCost > 0 ? (totalPnL / totalCost) * 100 : null

    const aggregateRow = (
      <tr key={`agg-${key}`}
        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer select-none"
        onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 p-0.5">
              {isOpen
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: `${cfg?.color}22`, color: cfg?.color }}>
              {first.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{first.symbol}</div>
              <div className="text-xs text-slate-400">{first.name} · {group.length} positions</div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${cfg?.bgColor}`}>
              {cfg?.label}
            </span>
          </div>
        </td>
        <td className="px-4 py-3"><PriceCell price={first.price} /></td>
        <td className="px-4 py-3">
          {first.change24h !== null ? (
            <span className={`font-medium ${first.change24h >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatPercent(first.change24h)}
            </span>
          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
        </td>
        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{formatNumber(totalQty)}</td>
        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatTHB(avgCostTHB)}</td>
        <td className="px-4 py-3"><ValueCell thbValue={totalValue ?? totalCost} /></td>
        <td className="px-4 py-3"><PnL val={totalPnL} pct={totalPnLPct} /></td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <VaultCell vaults={group.map(a => a.subPortfolio)} />
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()} />
      </tr>
    )

    return [
      aggregateRow,
      ...(isOpen ? group.map(a => renderChildRow(a)) : []),
    ]
  }

  const totalAssets = rows.length

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Holdings</h3>
        <span className="text-xs text-slate-400">{totalAssets} assets</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {['Asset', 'Price', '24h', 'Qty', 'Avg Cost', 'Value (USD / THB)', 'P&L', 'Vault', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {(() => {
              let lastType = null
              return groupKeys.flatMap(key => {
                const type = key.split('::')[1]
                const cfg = ASSET_TYPES[type]
                const rows = []
                if (type !== lastType) {
                  lastType = type
                  rows.push(
                    <tr key={`header-${type}`} className="bg-slate-50 dark:bg-slate-800/50">
                      <td colSpan={9} className="px-4 py-1.5">
                        <span className={`text-[11px] font-semibold tracking-widest uppercase ${cfg?.bgColor} px-2 py-0.5 rounded-full`}>
                          {cfg?.label}
                        </span>
                      </td>
                    </tr>
                  )
                }
                const result = renderGroupRows(key)
                rows.push(...(Array.isArray(result) ? result : [result]))
                return rows
              })
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}
