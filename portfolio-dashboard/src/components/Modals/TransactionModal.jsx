import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { getAssetStats } from '../../utils/assetUtils'
import { formatTHB, formatUSD, formatNumber } from '../../utils/formatters'
import { ASSET_TYPES } from '../../utils/assetConfig'
import { ModalShell, ModalHeader } from '../ui/Modal'
import { CurrencyToggle } from '../ui/CurrencyToggle'
import { usePriceInput } from '../../hooks/usePriceInput'
import { inputBase, inputAltCls } from '../../utils/styles'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function TransactionModal({ asset, onClose }) {
  const { activePortfolio, dispatch, getAssetPriceTHB, usdToThb } = usePortfolio()
  const [txType, setTxType] = useState('buy')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const stats = getAssetStats(asset)
  const cfg = ASSET_TYPES[asset.type]
  const currentPrice = getAssetPriceTHB(asset)
  const isHSH = asset.symbol === 'HSH'
  const qtyUnit = isHSH ? 'กรัม' : asset.symbol

  const { currency, toggleCurrency, qty, handleQty, perUnit, handlePerUnit, total, handleTotal, qtyNum, perUnitNum, perUnitTHB } = usePriceInput({
    usdToThb,
    initialPerUnit: currentPrice ? currentPrice.toFixed(2) : '',
  })

  const isValid = qtyNum > 0 && perUnitTHB > 0
  const isSellExceed = txType === 'sell' && qtyNum > stats.quantity

  const newAvgCost = () => {
    if (txType === 'sell' || !isValid) return null
    const totalCost = stats.avgCostTHB * stats.quantity + qtyNum * perUnitTHB
    const totalQ = stats.quantity + qtyNum
    return totalQ > 0 ? totalCost / totalQ : 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!isValid || isSellExceed) return
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        portfolioId: activePortfolio.id, assetId: asset.id,
        transaction: { id: `tx-${Date.now()}`, type: txType, quantity: qtyNum, pricePerUnit: perUnitTHB, date, note: note.trim() },
      },
    })
    onClose()
  }

  const inpCls = `${inputBase} focus:border-blue-500`

  return (
    <ModalShell className="max-w-md">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${cfg?.color}22`, color: cfg?.color }}>
            {asset.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white">{asset.symbol}</div>
            <div className="text-xs text-slate-400">{asset.name}</div>
          </div>
        </div>
      </ModalHeader>

      <form onSubmit={submit} className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-transparent">
          <div>
            <span className="text-slate-400">Holding</span>
            <div className="text-slate-900 dark:text-white font-semibold mt-0.5">{formatNumber(stats.quantity)} {qtyUnit}</div>
          </div>
          <div>
            <span className="text-slate-400">Avg Cost / Unit</span>
            <div className="text-slate-900 dark:text-white font-semibold mt-0.5">{formatTHB(stats.avgCostTHB)}</div>
          </div>
          {currentPrice && (
            <div>
              <span className="text-slate-400">Current Price</span>
              <div className="text-blue-500 dark:text-blue-400 font-semibold mt-0.5">
                {formatTHB(currentPrice)}
                <span className="text-xs text-slate-400 font-normal ml-1">({formatUSD(currentPrice / usdToThb)})</span>
              </div>
            </div>
          )}
        </div>

        {/* Buy/Sell */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: 'buy',  label: 'Buy',  Icon: TrendingUp,   active: 'bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30' },
            { type: 'sell', label: 'Sell', Icon: TrendingDown, active: 'bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30' },
          ].map(({ type, label, Icon, active }) => (
            <button key={type} type="button" onClick={() => setTxType(type)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === type ? active : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Quantity ({qtyUnit}) *</label>
          <input type="number" value={qty} onChange={e => handleQty(e.target.value)}
            placeholder="0" step="any" min="0" autoFocus
            className={`${inputBase} ${isSellExceed ? 'border-red-400 focus:border-red-500' : 'focus:border-blue-500'}`} />
          {isSellExceed && <p className="text-xs text-red-500 mt-1">Exceeds holding ({formatNumber(stats.quantity)} {qtyUnit})</p>}
        </div>

        {/* Currency toggle */}
        <CurrencyToggle value={currency} onChange={toggleCurrency} usdToThb={usdToThb} />

        {/* Price / Total */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Price / {isHSH ? 'กรัม' : 'Unit'} ({currency})</label>
            <input type="number" value={perUnit} onChange={e => handlePerUnit(e.target.value)}
              placeholder="0.00" step="any" min="0" className={inpCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              Total ({currency}) <span className="text-slate-300 dark:text-slate-600">← or enter here</span>
            </label>
            <input type="number" value={total} onChange={e => handleTotal(e.target.value)}
              placeholder="0.00" step="any" min="0" className={inputAltCls} />
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 -mt-2">Fill either field — the other is calculated automatically</p>

        {/* Date + Note */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inpCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Note</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="DCA, dividend..." className={inpCls} />
          </div>
        </div>

        {/* Preview */}
        {isValid && (
          <div className={`rounded-xl p-4 space-y-2 text-sm border ${txType === 'buy'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'}`}>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 dark:text-slate-400">{txType === 'buy' ? 'Buy' : 'Sell'} Amount</span>
              <div className="text-right">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {currency === 'USD' ? formatUSD(qtyNum * perUnitNum) : formatTHB(qtyNum * perUnitNum)}
                </div>
                {currency === 'USD' && (
                  <div className="text-xs text-slate-400 mt-0.5">{formatTHB(qtyNum * perUnitTHB)}</div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Qty after {txType}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatNumber(txType === 'buy' ? stats.quantity + qtyNum : stats.quantity - qtyNum)} {qtyUnit}
              </span>
            </div>
            {txType === 'buy' && newAvgCost() !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">New Avg Cost</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatTHB(newAvgCost())}</span>
              </div>
            )}
            {txType === 'sell' && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">P&L this trade</span>
                <span className={`font-semibold ${(perUnitTHB - stats.avgCostTHB) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatTHB(qtyNum * (perUnitTHB - stats.avgCostTHB))}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!isValid || isSellExceed}
            className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-40 ${txType === 'buy' ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'}`}>
            Confirm {txType === 'buy' ? 'Buy' : 'Sell'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
