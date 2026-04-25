import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { usePortfolio } from '../../context/PortfolioContext'
import { getAssetStats } from '../../utils/assetUtils'
import { ASSET_TYPES } from '../../utils/assetConfig'
import { formatTHB } from '../../utils/formatters'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-slate-900 dark:text-white font-semibold mb-1">{d.label}</p>
      <p className="text-slate-600 dark:text-slate-300">{formatTHB(d.value)}</p>
      <p className="text-blue-500 dark:text-blue-400">{d.pct}%</p>
    </div>
  )
}

export default function AllocationChart() {
  const { activePortfolio, getAssetPriceTHB } = usePortfolio()
  if (!activePortfolio) return null

  const grouped = {}
  activePortfolio.assets.forEach(a => {
    const stats = getAssetStats(a)
    const price = getAssetPriceTHB(a)
    const val = (price ?? stats.avgCostTHB) * stats.quantity
    grouped[a.type] = (grouped[a.type] || 0) + val
  })

  const total = Object.values(grouped).reduce((s, v) => s + v, 0)
  const data = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({
      type, value,
      label: ASSET_TYPES[type]?.label || type,
      color: ASSET_TYPES[type]?.color || '#64748b',
      pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
    }))

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col shadow-sm dark:shadow-none">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Asset Allocation</h3>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2.5 mt-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.pct}%</span>
              <span className="text-xs text-slate-400 ml-2">{formatTHB(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
