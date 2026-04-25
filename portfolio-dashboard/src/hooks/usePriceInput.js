import { useState } from 'react'

export function usePriceInput({ usdToThb, initialQty = '', initialPerUnit = '' } = {}) {
  const [currency, setCurrency] = useState('THB')
  const [qty, setQty] = useState(String(initialQty))
  const [perUnit, setPerUnit] = useState(String(initialPerUnit))
  const [total, setTotal] = useState(
    initialQty && initialPerUnit
      ? (parseFloat(initialQty) * parseFloat(initialPerUnit)).toFixed(2)
      : ''
  )

  const toggleCurrency = (next) => {
    if (next === currency) return
    const factor = next === 'USD' ? 1 / usdToThb : usdToThb
    if (perUnit) setPerUnit((parseFloat(perUnit) * factor).toFixed(next === 'USD' ? 6 : 2))
    if (total)   setTotal((parseFloat(total)   * factor).toFixed(2))
    setCurrency(next)
  }

  const handleQty = (val) => {
    setQty(val)
    if (val && perUnit) setTotal((parseFloat(val) * parseFloat(perUnit)).toFixed(2))
  }

  const handlePerUnit = (val) => {
    setPerUnit(val)
    if (val && qty) setTotal((parseFloat(val) * parseFloat(qty)).toFixed(2))
    else setTotal('')
  }

  const handleTotal = (val) => {
    setTotal(val)
    if (val && qty && parseFloat(qty) > 0) setPerUnit((parseFloat(val) / parseFloat(qty)).toFixed(8))
    else setPerUnit('')
  }

  const qtyNum     = parseFloat(qty)     || 0
  const perUnitNum = parseFloat(perUnit) || 0
  const perUnitTHB = currency === 'USD' ? perUnitNum * usdToThb : perUnitNum

  return { currency, toggleCurrency, qty, handleQty, perUnit, handlePerUnit, total, handleTotal, qtyNum, perUnitNum, perUnitTHB }
}
