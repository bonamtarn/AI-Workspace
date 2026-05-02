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

const GOLD_BAHT_TO_GRAM = 15.244

export default function TransactionModal({ asset, onClose }) {
  const { activePortfolio, dispatch, getAssetPriceTHB, usdToThb } = usePortfolio()
  const [txType, setTxType] = useState('buy')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const stats = getAssetStats(asset)
  const cfg = ASSET_TYPES[asset.type]
  const currentPrice = getAssetPriceTHB(asset) // THB/gram for HSH
  const isHSH = asset.symbol === 'HSH'

  // HSH-specific states
  const [goldUnit, setGoldUnit] = useState('baht')
  const [goldQty, setGoldQty] = useState('')
  const [goldCostPerBaht, setGoldCostPerBaht] = useState(() =>
    currentPrice ? (currentPrice * GOLD_BAHT_TO_GRAM).toFixed(2) : ''
  )
  const [goldTotal, setGoldTotal] = useState('')

  // non-HSH price input
  const { currency, toggleCurrency, qty, handleQty, perUnit, handlePerUnit, total, handleTotal, qtyNum, perUnitNum, perUnitTHB } = usePriceInput({
    usdToThb,
    initialPerUnit: (!isHSH && currentPrice) ? currentPrice.toFixed(2) : '',
  })

  // HSH computed values
  const goldQtyNum = parseFloat(goldQty) || 0
  const goldCostNum = parseFloat(goldCostPerBaht) || 0
  const goldQtyGrams = goldUnit === 'baht' ? goldQtyNum * GOLD_BAHT_TO_GRAM : goldQtyNum
  const goldCostPerGram = goldCostNum / GOLD_BAHT_TO_GRAM
  const goldTotalTHB = parseFloat(goldTotal) || 0

  const computeGrams = (val, unit) => {
    const n = parseFloat(val) || 0
    return unit === 'baht' ? n * GOLD_BAHT_TO_GRAM : n
  }

  const handleGoldQty = (val) => {
    setGoldQty(val)
    const grams = computeGrams(val, goldUnit)
    const price = parseFloat(goldCostPerBaht) || 0
    const tot = parseFloat(goldTotal) || 0
    if (grams > 0) {
      if (price > 0) setGoldTotal((grams * price / GOLD_BAHT_TO_GRAM).toFixed(2))
      else if (tot > 0) setGoldCostPerBaht((tot * GOLD_BAHT_TO_GRAM / grams).toFixed(2))
    }
  }

  const handleGoldPrice = (val) => {
    setGoldCostPerBaht(val)
    const price = parseFloat(val) || 0
    if (price > 0 && goldQtyGrams > 0) setGoldTotal((goldQtyGrams * price / GOLD_BAHT_TO_GRAM).toFixed(2))
    else setGoldTotal('')
  }

  const handleGoldTotal = (val) => {
    setGoldTotal(val)
    const tot = parseFloat(val) || 0
    if (tot > 0 && goldQtyGrams > 0) setGoldCostPerBaht((tot * GOLD_BAHT_TO_GRAM / goldQtyGrams).toFixed(2))
    else setGoldCostPerBaht('')
  }

  const handleGoldUnitChange = (newUnit) => {
    if (newUnit === goldUnit) return
    const num = parseFloat(goldQty) || 0
    if (num > 0) {
      const converted = newUnit === 'gram'
        ? (num * GOLD_BAHT_TO_GRAM).toFixed(4).replace(/\.?0+$/, '')
        : (num / GOLD_BAHT_TO_GRAM).toFixed(4).replace(/\.?0+$/, '')
      setGoldQty(converted)
    }
    setGoldUnit(newUnit)
  }

  // Holding always displayed in grams for HSH
  const holdingGrams = stats.quantity
  const holdingDisplay = formatNumber(holdingGrams)
  const holdingUnit = 'กรัม'

  const isValid = isHSH ? goldQtyNum > 0 && (goldCostNum > 0 || goldTotalTHB > 0) : qtyNum > 0 && perUnitTHB > 0
  const isSellExceed = isHSH
    ? txType === 'sell' && goldQtyGrams > holdingGrams
    : txType === 'sell' && qtyNum > stats.quantity

  const newAvgCostTHB = () => {
    if (txType === 'sell' || !isValid) return null
    if (isHSH) {
      const totalCost = stats.avgCostTHB * holdingGrams + goldQtyGrams * goldCostPerGram
      const totalGrams = holdingGrams + goldQtyGrams
      return totalGrams > 0 ? (totalCost / totalGrams) * GOLD_BAHT_TO_GRAM : 0
    }
    const totalCost = stats.avgCostTHB * stats.quantity + qtyNum * perUnitTHB
    const totalQ = stats.quantity + qtyNum
    return totalQ > 0 ? totalCost / totalQ : 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!isValid || isSellExceed) return
    const transaction = isHSH
      ? { id: `tx-${Date.now()}`, type: txType, quantity: goldQtyGrams, pricePerUnit: goldCostPerGram, date, note: note.trim() }
      : { id: `tx-${Date.now()}`, type: txType, quantity: qtyNum, pricePerUnit: perUnitTHB, date, note: note.trim() }
    dispatch({ type: 'ADD_TRANSACTION', payload: { portfolioId: activePortfolio.id, assetId: asset.id, transaction } })
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
            <div className="text-slate-900 dark:text-white font-semibold mt-0.5">
              {holdingDisplay} {holdingUnit}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Avg Cost {isHSH ? '/ บาทน้ำหนัก' : '/ Unit'}</span>
            <div className="text-slate-900 dark:text-white font-semibold mt-0.5">
              {formatTHB(isHSH ? stats.avgCostTHB * GOLD_BAHT_TO_GRAM : stats.avgCostTHB)}
            </div>
          </div>
          {currentPrice && (
            <div>
              <span className="text-slate-400">Current Price {isHSH ? '/ บาทน้ำหนัก' : ''}</span>
              <div className="text-blue-500 dark:text-blue-400 font-semibold mt-0.5">
                {formatTHB(isHSH ? currentPrice * GOLD_BAHT_TO_GRAM : currentPrice)}
                {!isHSH && <span className="text-xs text-slate-400 font-normal ml-1">({formatUSD(currentPrice / usdToThb)})</span>}
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
        {isHSH ? (
          <div className="space-y-2">
            <label className="block text-xs text-slate-500 dark:text-slate-400">Quantity *</label>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
              {[['baht', 'บาทน้ำหนัก (15.244g)'], ['gram', 'กรัม']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => handleGoldUnitChange(val)}
                  className={`flex-1 py-2 transition-colors ${goldUnit === val ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            <input type="number" value={goldQty} onChange={e => handleGoldQty(e.target.value)}
              placeholder="0" step="any" min="0" autoFocus
              className={`${inputBase} ${isSellExceed ? 'border-red-400 focus:border-red-500' : 'focus:border-blue-500'}`} />
            {isSellExceed && (
              <p className="text-xs text-red-500">Exceeds holding ({holdingDisplay} {holdingUnit})</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Quantity ({asset.symbol}) *</label>
            <input type="number" value={qty} onChange={e => handleQty(e.target.value)}
              placeholder="0" step="any" min="0" autoFocus
              className={`${inputBase} ${isSellExceed ? 'border-red-400 focus:border-red-500' : 'focus:border-blue-500'}`} />
            {isSellExceed && <p className="text-xs text-red-500 mt-1">Exceeds holding ({formatNumber(stats.quantity)})</p>}
          </div>
        )}

        {/* Price inputs */}
        {isHSH ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">ราคา / บาทน้ำหนัก (THB)</label>
                <input type="number" value={goldCostPerBaht} onChange={e => handleGoldPrice(e.target.value)}
                  placeholder="0.00" step="any" min="0" className={inpCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  ต้นทุนรวม (THB) <span className="text-slate-300 dark:text-slate-600">← หรือกรอกที่นี่</span>
                </label>
                <input type="number" value={goldTotal} onChange={e => handleGoldTotal(e.target.value)}
                  placeholder="0.00" step="any" min="0" className={inputAltCls} />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-600 -mt-2">กรอกช่องใดก็ได้ — อีกช่องจะคำนวณอัตโนมัติ</p>
          </>
        ) : (
          <>
            <CurrencyToggle value={currency} onChange={toggleCurrency} usdToThb={usdToThb} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Price / Unit ({currency})</label>
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
          </>
        )}

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
                  {isHSH
                    ? formatTHB(goldTotalTHB)
                    : currency === 'USD' ? formatUSD(qtyNum * perUnitNum) : formatTHB(qtyNum * perUnitNum)}
                </div>
                {!isHSH && currency === 'USD' && (
                  <div className="text-xs text-slate-400 mt-0.5">{formatTHB(qtyNum * perUnitTHB)}</div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Qty after {txType}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {isHSH ? (() => {
                  const afterGrams = txType === 'buy' ? holdingGrams + goldQtyGrams : holdingGrams - goldQtyGrams
                  return `${formatNumber(afterGrams)} กรัม`
                })() : (
                  `${formatNumber(txType === 'buy' ? stats.quantity + qtyNum : stats.quantity - qtyNum)} ${asset.symbol}`
                )}
              </span>
            </div>
            {txType === 'buy' && newAvgCostTHB() !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">New Avg Cost {isHSH ? '/ บาทน้ำหนัก' : ''}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatTHB(newAvgCostTHB())}</span>
              </div>
            )}
            {txType === 'sell' && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">P&L this trade</span>
                <span className={`font-semibold ${isHSH
                  ? (goldCostPerGram - stats.avgCostTHB) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  : (perUnitTHB - stats.avgCostTHB) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isHSH
                    ? formatTHB(goldQtyGrams * (goldCostPerGram - stats.avgCostTHB))
                    : formatTHB(qtyNum * (perUnitTHB - stats.avgCostTHB))}
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
