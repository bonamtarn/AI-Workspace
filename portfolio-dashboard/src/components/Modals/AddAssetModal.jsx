import { useState, useEffect, useMemo, useRef } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { ASSET_TYPES, PRESET_ASSETS } from '../../utils/assetConfig'
import { formatTHB, formatUSD } from '../../utils/formatters'
import { fetchMutualFundNAV, fetchFundList } from '../../services/fundService'
import { fetchGoldBarSellPrice } from '../../services/goldService'
import { ModalShell, ModalHeader } from '../ui/Modal'
import { CurrencyToggle } from '../ui/CurrencyToggle'
import { usePriceInput } from '../../hooks/usePriceInput'
import { inputCls, inputAltCls } from '../../utils/styles'
import { RefreshCw } from 'lucide-react'

const GOLD_BAHT_TO_GRAM = 15.244

export default function AddAssetModal({ asset: editing, onClose }) {
  const { activePortfolio, dispatch, usdToThb } = usePortfolio()
  const isEdit = !!editing
  const editingIsHSH = editing?.symbol === 'HSH'

  const [type, setType] = useState(editing?.type || 'crypto')
  const [symbol, setSymbol] = useState(editing?.symbol || '')
  const [name, setName] = useState(editing?.name || '')
  const [yahoo, setYahoo] = useState(editing?.yahooSymbol || '')
  const [subPortfolio, setSubPortfolio] = useState(editing?.subPortfolio || '')
  const [manualPrice, setManualPrice] = useState(() => {
    if (!editing?.manualPriceTHB) return ''
    return editingIsHSH
      ? (editing.manualPriceTHB * GOLD_BAHT_TO_GRAM).toFixed(2)
      : editing.manualPriceTHB.toString()
  })
  const [navLoading, setNavLoading] = useState(false)
  const [navError, setNavError] = useState(null)
  const [goldLoading, setGoldLoading] = useState(false)
  const [goldError, setGoldError] = useState(null)

  // Fund autocomplete
  const [fundList, setFundList] = useState([])
  const [showFundDropdown, setShowFundDropdown] = useState(false)
  const symbolInputRef = useRef(null)

  // HSH-specific states (qty in selected unit, cost always THB/บาทน้ำหนัก)
  const [goldUnit, setGoldUnit] = useState('baht')
  const [goldQty, setGoldQty] = useState(() =>
    editingIsHSH ? (editing.quantity / GOLD_BAHT_TO_GRAM).toFixed(4).replace(/\.?0+$/, '') : ''
  )
  const [goldCostPerBaht, setGoldCostPerBaht] = useState(() =>
    editingIsHSH ? (editing.avgCostTHB * GOLD_BAHT_TO_GRAM).toFixed(2) : ''
  )
  const [goldTotal, setGoldTotal] = useState(() => {
    if (!editingIsHSH) return ''
    const grams = editing.quantity
    const costPerGram = editing.avgCostTHB
    return grams > 0 && costPerGram > 0 ? (grams * costPerGram).toFixed(2) : ''
  })

  // usePriceInput for non-HSH assets
  const { currency, toggleCurrency, qty, handleQty, perUnit, handlePerUnit, total, handleTotal, qtyNum, perUnitNum, perUnitTHB } = usePriceInput({
    usdToThb,
    initialQty: editingIsHSH ? '' : (editing?.quantity?.toString() || ''),
    initialPerUnit: editingIsHSH ? '' : (editing?.avgCostTHB?.toString() || ''),
  })

  const isHSH = type === 'gold' && symbol === 'HSH'

  // HSH computed values
  const goldQtyNum = parseFloat(goldQty) || 0
  const goldCostNum = parseFloat(goldCostPerBaht) || 0
  const goldQtyGrams = goldUnit === 'baht' ? goldQtyNum * GOLD_BAHT_TO_GRAM : goldQtyNum
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
  }

  const handleGoldTotal = (val) => {
    setGoldTotal(val)
    const tot = parseFloat(val) || 0
    if (tot > 0 && goldQtyGrams > 0) setGoldCostPerBaht((tot * GOLD_BAHT_TO_GRAM / goldQtyGrams).toFixed(2))
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

  // Load fund list once when mutual_fund tab is active
  useEffect(() => {
    if (type !== 'mutual_fund' || fundList.length > 0) return
    fetchFundList().then(setFundList).catch(() => {})
  }, [type])

  const fundDropdownItems = useMemo(() => {
    if (type !== 'mutual_fund' || !symbol.trim() || !fundList.length) return []
    const q = symbol.toUpperCase()
    const starts = fundList.filter(f => f.code.toUpperCase().startsWith(q))
    const contains = fundList.filter(f =>
      !f.code.toUpperCase().startsWith(q) &&
      (f.code.toUpperCase().includes(q) || f.name.toUpperCase().includes(q))
    )
    return [...starts, ...contains].slice(0, 10)
  }, [symbol, fundList, type])

  const selectFund = (fund) => {
    setSymbol(fund.code)
    setName(fund.name)
    setShowFundDropdown(false)
  }

  const presets = PRESET_ASSETS[type] || []
  const pickPreset = (p) => { setSymbol(p.symbol); setName(p.name); setYahoo(p.yahooSymbol || '') }

  const autoFetchGoldPrice = async () => {
    setGoldLoading(true)
    setGoldError(null)
    try {
      const { price, source } = await fetchGoldBarSellPrice()
      setManualPrice(price.toString())
      setGoldError(`ราคาขายออก ทองแท่ง จาก ${source}`)
    } catch (e) {
      setGoldError(e.message)
    } finally {
      setGoldLoading(false)
    }
  }

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

  const isValid = isHSH
    ? symbol && goldQtyNum > 0 && (goldCostNum > 0 || goldTotalTHB > 0)
    : symbol && qtyNum > 0 && perUnitTHB > 0

  const submit = (e) => {
    e.preventDefault()
    if (!isValid) return
    const resolvedCostPerGram = goldCostNum > 0
      ? goldCostNum / GOLD_BAHT_TO_GRAM
      : goldTotalTHB > 0 && goldQtyGrams > 0 ? goldTotalTHB / goldQtyGrams : 0
    const asset = isHSH ? {
      id: editing?.id || `a-${Date.now()}`,
      symbol: 'HSH',
      name: name.trim() || 'ฮั่วเซ่งเฮง',
      type,
      quantity: goldQtyGrams,
      avgCostTHB: resolvedCostPerGram,
      costCurrency: 'THB',
      ...(manualPrice && { manualPriceTHB: parseFloat(manualPrice) / GOLD_BAHT_TO_GRAM }),
      ...(subPortfolio.trim() && { subPortfolio: subPortfolio.trim() }),
      ...(editing?.transactions && { transactions: editing.transactions }),
    } : {
      id: editing?.id || `a-${Date.now()}`,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim(),
      type, quantity: qtyNum, avgCostTHB: perUnitTHB, costCurrency: currency,
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
          <div className="relative">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Symbol *</label>
            {type === 'mutual_fund' ? (
              <>
                <input
                  ref={symbolInputRef}
                  value={symbol}
                  onChange={e => { setSymbol(e.target.value.toUpperCase()); setShowFundDropdown(true) }}
                  onFocus={() => { if (symbol) setShowFundDropdown(true) }}
                  onBlur={() => setTimeout(() => setShowFundDropdown(false), 150)}
                  placeholder="ES-US500, SCBGOLD…"
                  className={inputCls}
                  autoComplete="off"
                />
                {showFundDropdown && fundDropdownItems.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {fundDropdownItems.map(f => (
                      <button
                        key={`${f.code}-${f.source}`}
                        type="button"
                        onMouseDown={() => selectFund(f)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{f.code}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{f.source}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{f.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="BTC, ETH, PTT" className={inputCls} />
            )}
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

        {/* Quantity — HSH has unit toggle */}
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
              placeholder="0" step="any" min="0" className={inputCls} />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Quantity *</label>
            <input type="number" value={qty} onChange={e => handleQty(e.target.value)} placeholder="0" step="any" min="0" className={inputCls} />
          </div>
        )}

        {/* Gold price auto-fetch (HSH) */}
        {isHSH && (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              ราคาทองแท่ง ขายออก (THB/บาทน้ำหนัก) <span className="text-slate-300 dark:text-slate-600">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="0.00" step="any" min="0" className={inputCls} />
              <button type="button" onClick={autoFetchGoldPrice} disabled={goldLoading}
                title="ดึงราคาทองจาก goldtraders.or.th"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-400 text-xs font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors disabled:opacity-40 shrink-0">
                <RefreshCw className={`w-3.5 h-3.5 ${goldLoading ? 'animate-spin' : ''}`} /> Auto
              </button>
            </div>
            <p className="text-xs mt-1">
              {goldError && !goldError.includes('ไม่พบ') && !goldError.includes('ดึง')
                ? <span className="text-green-500">{goldError}</span>
                : goldError
                  ? <span className="text-red-400">{goldError}</span>
                  : <span className="text-slate-400">กด Auto เพื่อดึงราคาจาก goldtraders.or.th</span>}
            </p>
          </div>
        )}

        {/* Cost inputs — HSH: always THB/บาทน้ำหนัก | others: currency toggle + per-unit/total */}
        {isHSH ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">ต้นทุน / บาทน้ำหนัก (THB)</label>
                <input type="number" value={goldCostPerBaht} onChange={e => handleGoldPrice(e.target.value)}
                  placeholder="0.00" step="any" min="0" className={inputCls} />
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
            <CurrencyToggle value={currency} onChange={toggleCurrency} usdToThb={usdToThb} label="Cost in:" />
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
          </>
        )}

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
              {isHSH ? (
                <>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatTHB(goldTotalTHB)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{formatUSD(goldTotalTHB / usdToThb)}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {currency === 'USD' ? formatUSD(qtyNum * perUnitNum) : formatTHB(qtyNum * perUnitNum)}
                  </div>
                  {currency === 'USD' && (
                    <div className="text-xs text-slate-400 mt-0.5">{formatTHB(qtyNum * perUnitTHB)}</div>
                  )}
                </>
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
