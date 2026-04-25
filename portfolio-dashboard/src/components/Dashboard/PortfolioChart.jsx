import { useState, useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { ASSET_TYPES } from '../../utils/assetConfig'
import { formatPercent } from '../../utils/formatters'
import { fetchTVHistory, fetchWMHistory } from '../../services/historyService'
import { Loader2 } from 'lucide-react'

const TIMEFRAMES = [
  { id: '24H', label: '24H', days: 1    },
  { id: '1W',  label: '1W',  days: 7    },
  { id: '1M',  label: '1M',  days: 30   },
  { id: '3M',  label: '3M',  days: 90   },
  { id: '6M',  label: '6M',  days: 180  },
  { id: '1Y',  label: '1Y',  days: 365  },
  { id: '3Y',  label: '3Y',  days: 1095 },
  { id: '5Y',  label: '5Y',  days: 1825 },
]

const STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'FRAX'])

// Last data point whose timestamp is ≤ targetTs; null if target is before earliest data
function getPriceAt(sorted, targetTs) {
  if (!sorted.length || sorted[0][0] > targetTs) return null
  let lo = 0, hi = sorted.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (sorted[mid][0] <= targetTs) lo = mid
    else hi = mid - 1
  }
  return sorted[lo][1]
}

async function buildReturnRows(assets, usdToThb) {
  const seen = new Set()
  const unique = assets.filter(a => {
    if (STABLECOINS.has(a.symbol.toUpperCase())) return false
    const key = `${a.symbol}::${a.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return Promise.all(unique.map(async a => {
    let prices = null
    if (a.type === 'mutual_fund') {
      prices = await fetchWMHistory(a.symbol)
    } else {
      prices = await fetchTVHistory(a.symbol, usdToThb)
    }

    if (!prices?.length) return { symbol: a.symbol, name: a.name, type: a.type, returns: {} }

    const sorted = [...prices].sort((x, y) => x[0] - y[0])
    const latestTs    = sorted[sorted.length - 1][0]
    const latestPrice = sorted[sorted.length - 1][1]

    const returns = {}
    for (const { id, days } of TIMEFRAMES) {
      const histPrice = getPriceAt(sorted, latestTs - days * 86_400_000)
      if (histPrice && histPrice > 0)
        returns[id] = (latestPrice - histPrice) / histPrice * 100
    }

    return { symbol: a.symbol, name: a.name, type: a.type, returns }
  }))
}

function ReturnCell({ value }) {
  if (value == null)
    return <td className="px-3 py-3 text-center text-slate-300 dark:text-slate-600 text-xs select-none">—</td>
  const pos = value >= 0
  return (
    <td className="px-3 py-3 text-center">
      <span className={`text-xs font-semibold tabular-nums ${pos ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
        {formatPercent(value)}
      </span>
    </td>
  )
}

export default function PortfolioChart() {
  const { activePortfolio, usdToThb } = usePortfolio()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const assetKey = activePortfolio?.assets?.map(a => `${a.symbol}:${a.type}`).join(',') ?? ''

  useEffect(() => {
    if (!activePortfolio?.assets?.length) return
    let cancelled = false
    setLoading(true)
    setError(null)

    buildReturnRows(activePortfolio.assets, usdToThb)
      .then(data => {
        if (!cancelled) {
          setRows(data)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) { setError(e.message); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [assetKey, usdToThb]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!activePortfolio) return null

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">

      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Asset Performance</h3>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
      </div>

      {error ? (
        <div className="p-5 text-xs text-slate-400 text-center">{error}</div>
      ) : loading && rows.length === 0 ? (
        <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูล...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Asset</th>
                {TIMEFRAMES.map(tf => (
                  <th key={tf.id} className="px-3 py-3 text-center font-semibold">{tf.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(() => {
                const TYPE_ORDER = Object.keys(ASSET_TYPES)
                const sorted = [...rows].sort((a, b) =>
                  TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
                )
                let lastType = null
                return sorted.flatMap(row => {
                  const cfg = ASSET_TYPES[row.type]
                  const result = []
                  if (row.type !== lastType) {
                    lastType = row.type
                    result.push(
                      <tr key={`header-${row.type}`} className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={TIMEFRAMES.length + 1} className="px-4 py-1.5">
                          <span className={`text-[11px] font-semibold tracking-widest uppercase ${cfg?.bgColor} px-2 py-0.5 rounded-full`}>
                            {cfg?.label}
                          </span>
                        </td>
                      </tr>
                    )
                  }
                  result.push(
                    <tr key={`${row.symbol}::${row.type}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: `${cfg?.color}22`, color: cfg?.color }}>
                            {row.symbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{row.symbol}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[90px]">{row.name}</div>
                          </div>
                        </div>
                      </td>
                      {TIMEFRAMES.map(tf => (
                        <ReturnCell key={tf.id} value={row.returns[tf.id] ?? null} />
                      ))}
                    </tr>
                  )
                  return result
                })
              })()}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={TIMEFRAMES.length + 1} className="px-4 py-8 text-center text-xs text-slate-400">
                    ไม่มีข้อมูลสำหรับสินทรัพย์ในพอร์ตนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
