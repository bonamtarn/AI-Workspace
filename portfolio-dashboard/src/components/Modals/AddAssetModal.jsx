import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { ASSET_TYPES, PRESET_ASSETS } from '../../utils/assetConfig'
import { formatTHB, formatUSD } from '../../utils/formatters'
import { fetchMutualFundNAV } from '../../services/fundService'
import { ModalShell, ModalHeader } from '../ui/Modal'
import { CurrencyToggle } from '../ui/CurrencyToggle'
import { usePriceInput } from '../../hooks/usePriceInput'
import { inputCls, inputAltCls } from '../../utils/styles'
import { RefreshCw } from 'lucide-react'

export default function AddAssetModal({ asset: editing, onClose }) {
  const { activePortfolio, dispatch, usdToThb } = usePortfolio()
  const isEdit = !!editing

  const [type, setType] = useState(editing?.type || 'crypto')
  const [symbol, setSymbol] = useState(editing?.symbol || '')
  const [name, setName] = useState(editing?.name || '')
  const [yahoo, setYahoo] = useState(editing?.yahooSymbol || '')
  const [subPortfolio, setSubPortfolio] = useState(editing?.subPortfolio || '')
  const [manualPrice, setManualPrice] = useState(editing?.manualPriceTHB?.toString() || '')
  const [navLoading, setNavLoading] = useState(false)
  const [navError, setNavError] = useState(null)

  const { currency, toggleCurrency, qty, handleQty, perUnit, handlePerUnit, total, handleTotal, qtyNum, perUnitNum, perUnitTHB } = usePriceInput({
    usdToThb,
    initialQty: editing?.quantity?.toString() || '',
    initialPerUnit: editing?.avgCostTHB?.toString() || '',
  })

  const presets = PRESET_ASSETS[type] || []
  const pickPreset = (p) => { setSymbol(p.symbol); setName(p.name); setYahoo(p.yahooSymbol || '') }

  const autoFetchNAV = async () => {
    if (!symbol) return
    setNavLoading(true)
    setNavError(null)
    try {
      const { nav, source, date } = await fetchMutualFundNAV(symbol)
      setManualPrice(nav.toString())
      setNavError(`NAV ณ ${date || 'วันนี้'} จาก ${source}`)
    } catch (e) {
      setNavError(e.message)
    } finally {
      setNavLoading(false)
    }
  }

  const isValid = symbol && qtyNum > 0 && perUnitTHB > 0

  const submit = (e) => {
    e.preventDefault()
    if (!isValid) return
    const asset = {
      id: editing?.id || `a-${Date.now()}`,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim(),
      type, quantity: qtyNum, avgCostTHB: perUnitTHB,
      ...(yahoo && { yahooSymbol: yahoo.trim() }),
      ...(manualPrice && { manualPriceTHB: parseFloat(manualPrice) }),
      ...(subPortfolio.trim() && { subPortfolio: subPortfolio.trim() }),
      ...(editing?.transactions && { transactions: editing.transactions }),
    }
    dispatch({ type: isEdit ? 'UPDATE_ASSET' : 'ADD_ASSET', payload: { portfolioId: activePortfolio.id, asset } })
    onClose()
  }

  return (
    <ModalShell className="max-w-lg max-h-[92vh] overflow-y-auto">
      <ModalHeader onClose={onClose}>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Asset' : 'Add Asset'}</h2>
      </ModalHeader>

      <form onSubmit={submit} className="p-5 space-y-4">
        {/* Type */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Asset Type</label>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(ASSET_TYPES).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => { setType(key); setSymbol(''); setName(''); setYahoo('') }}
                className={`py-2 rounded-lg text-xs font-medium transition-all ${type === key ? `${cfg.bgColor} ring-1 ring-current/30` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        {presets.length > 0 && (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Quick Select</label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button key={p.symbol} type="button" onClick={() => pickPreset(p)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${symbol === p.symbol ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  {p.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbol + Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Symbol *</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="BTC, ETH, PTT" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Bitcoin" className={inputCls} />
          </div>
        </div>

        {/* Sub-portfolio */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            Sub-Portfolio / Exchange <span className="text-slate-300 dark:text-slate-600">(optional)</span>
          </label>
          <input value={subPortfolio} onChange={e => setSubPortfolio(e.target.value)} placeholder="Binance, OKX, Bitkub, กองทุน A..." className={inputCls} />
          <p className="text-xs text-slate-400 mt-1">Assets with the same symbol will be grouped together — use this to separate by exchange or fund</p>
        </div>

        {/* Yahoo */}
        {(type === 'stock' || type === 'etf') && (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Yahoo Finance Symbol</label>
            <input value={yahoo} onChange={e => setYahoo(e.target.value)} placeholder="PTT.BK or SPY" className={inputCls} />
            <p className="text-xs text-slate-400 mt-1">Thai stocks: add .BK suffix e.g. PTT.BK · US stocks/ETFs: use ticker directly e.g. SPY</p>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Quantity *</label>
          <input type="number" value={qty} onChange={e => handleQty(e.target.value)} placeholder="0" step="any" min="0" className={inputCls} />
        </div>

        {/* Currency toggle */}
        <CurrencyToggle value={currency} onChange={toggleCurrency} usdToThb={usdToThb} label="Cost in:" />

        {/* Cost per unit / Total */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Cost / Unit ({currency})</label>
            <input type="number" value={perUnit} onChange={e => handlePerUnit(e.target.value)} placeholder="0.00" step="any" min="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              Total Investment ({currency}) <span className="text-slate-300 dark:text-slate-600">← or enter here</span>
            </label>
            <input type="number" value={total} onChange={e => handleTotal(e.target.value)} placeholder="0.00" step="any" min="0" className={inputAltCls} />
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 -mt-2">Fill either field — the other is calculated automatically</p>

        {/* Manual NAV */}
        {type === 'mutual_fund' && (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              Current NAV (THB) <span className="text-slate-300 dark:text-slate-600">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="0.00" step="any" min="0" className={inputCls} />
              {symbol && (
                <button type="button" onClick={autoFetchNAV} disabled={navLoading}
                  title="ดึง NAV อัตโนมัติ"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 shrink-0">
                  <RefreshCw className={`w-3.5 h-3.5 ${navLoading ? 'animate-spin' : ''}`} /> Auto
                </button>
              )}
            </div>
            <p className="text-xs mt-1">
              {navError && navError.startsWith('NAV ณ')
                ? <span className="text-green-500">{navError}</span>
                : navError
                  ? <span className="text-red-400">{navError}</span>
                  : <span className="text-slate-400">กรอก NAV ต่อหน่วย{symbol ? ' หรือกด Auto' : ''}</span>}
              {manualPrice && qtyNum > 0 && (
                <span className="ml-1 text-blue-500">· มูลค่าปัจจุบัน = {formatTHB(parseFloat(manualPrice) * qtyNum)}</span>
              )}
            </p>
          </div>
        )}

        {/* Summary */}
        {isValid && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-4 py-3 flex items-center justify-between border border-slate-100 dark:border-transparent">
            <span className="text-xs text-slate-500">Total Cost</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {currency === 'USD' ? formatUSD(qtyNum * perUnitNum) : formatTHB(qtyNum * perUnitNum)}
              </div>
              {currency === 'USD' && (
                <div className="text-xs text-slate-400 mt-0.5">{formatTHB(qtyNum * perUnitTHB)}</div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!isValid}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
            {isEdit ? 'Save Changes' : 'Add Asset'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
