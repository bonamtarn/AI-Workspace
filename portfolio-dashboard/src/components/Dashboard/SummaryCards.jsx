import { usePortfolio } from '../../context/PortfolioContext'
import { getAssetStats } from '../../utils/assetUtils'
import { formatTHB, formatPercent, formatCompact } from '../../utils/formatters'
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react'

function Card({ icon: Icon, iconBg, label, main, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white truncate">{main}</p>
          {sub && <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards() {
  const { activePortfolio, getAssetPriceTHB, get24hChange } = usePortfolio()
  if (!activePortfolio) return null

  let totalValue = 0, totalCost = 0, pricedCost = 0, dailyPnL = 0, profitCount = 0, totalRealizedPnL = 0

  activePortfolio.assets.forEach(a => {
    const stats = getAssetStats(a)
    const price = getAssetPriceTHB(a)
    const cost = stats.avgCostTHB * stats.quantity
    totalCost += cost
    totalRealizedPnL += stats.realizedPnL || 0
    // When price is unknown, use cost as value (contributes 0 to P&L)
    const value = price !== null ? price * stats.quantity : cost
    totalValue += value
    if (price !== null) {
      pricedCost += cost
      if (value > cost) profitCount++
    }
    const chg = get24hChange(a)
    if (price !== null && chg !== null) dailyPnL += value * (chg / 100)
  })

  const totalPnL = totalValue - totalCost
  // Use only priced-asset cost as denominator so unpriced assets don't dilute the %
  const totalPnLPct = pricedCost > 0 ? (totalPnL / pricedCost) * 100 : 0
  const dailyPct = totalValue > 0 ? (dailyPnL / totalValue) * 100 : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        icon={Wallet} iconBg="bg-blue-500/20 text-blue-500"
        label="Portfolio Value (THB)" main={formatCompact(totalValue)}
        sub={`Cost ${formatCompact(totalCost)}`} subColor="text-slate-400 dark:text-slate-500"
      />
      <Card
        icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
        iconBg={totalPnL >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}
        label="Unrealized P&L" main={formatTHB(totalPnL)}
        sub={formatPercent(totalPnLPct)} subColor={totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}
      />
      <Card
        icon={Activity}
        iconBg={dailyPnL >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}
        label="24h Change" main={formatTHB(dailyPnL)}
        sub={formatPercent(dailyPct)} subColor={dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}
      />
      <Card
        icon={TrendingUp}
        iconBg={totalRealizedPnL >= 0 ? 'bg-violet-500/20 text-violet-500' : 'bg-red-500/20 text-red-500'}
        label="Realized P&L" main={formatTHB(totalRealizedPnL)}
        sub={`${profitCount}/${activePortfolio.assets.length} profitable`} subColor="text-slate-400 dark:text-slate-500"
      />
    </div>
  )
}
