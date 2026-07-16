import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useCuentas, useDeudas, useInversiones, useMovimientos } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { WidgetError, WidgetLoading } from './WidgetState'
import type { Movimiento } from '@/types/api'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)
const pad = (n: number) => String(n).padStart(2, '0')

type Range = 'YTD' | '1A' | '5A' | 'MAX'
const RANGES: [Range, string][] = [
  ['YTD', 'YTD'],
  ['1A', '1 año'],
  ['5A', '5 años'],
  ['MAX', 'Máx'],
]

// Efecto de un movimiento sobre la caja (gasto/inversión resta, ingreso suma)
function signed(m: Movimiento): number {
  const neg = m.tipoMovimiento === 'GASTO' || m.tipoMovimiento === 'INVERSION'
  return neg ? -Number(m.importe || 0) : Number(m.importe || 0)
}

export default function PatrimonioEvolucionWidget() {
  const { theme } = useTheme()
  const [range, setRange] = useState<Range>('1A')

  const cu = useCuentas()
  const inv = useInversiones()
  const de = useDeudas()
  const mo = useMovimientos()

  if (cu.isLoading || inv.isLoading || de.isLoading || mo.isLoading) return <WidgetLoading />
  if (cu.isError || inv.isError || de.isError || mo.isError) return <WidgetError />

  const cashNow = sum((cu.data ?? []).map((c) => c.importe))
  const invNow = sum((inv.data ?? []).map((i) => i.capitalTotal))
  const debtNow = sum((de.data ?? []).map((d) => d.cantidadPendiente))
  const patNow = cashNow + invNow - debtNow
  const movs = mo.data ?? []

  const now = new Date()
  let months: number
  if (range === 'YTD') months = now.getMonth()
  else if (range === '1A') months = 12
  else if (range === '5A') months = 60
  else {
    const dates = movs.map((m) => m.fechaTransaccion).filter(Boolean).sort()
    months = dates.length
      ? (now.getFullYear() - new Date(dates[0]).getFullYear()) * 12 +
        (now.getMonth() - new Date(dates[0]).getMonth())
      : 12
  }
  months = Math.max(1, months)

  const labels: string[] = []
  const values: number[] = []
  for (let i = months; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const cut = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`
    // Patrimonio a fin de ese mes = actual − movimientos posteriores.
    const future = sum(movs.filter((m) => (m.fechaTransaccion ?? '') >= cut).map(signed))
    labels.push(`${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`)
    values.push(patNow - future)
  }

  const t = chartTheme()
  const data = {
    labels,
    datasets: [
      {
        label: 'Patrimonio',
        data: values,
        borderColor: '#2f81f7',
        backgroundColor: 'rgba(47, 129, 247, 0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexShrink: 0 }}>
        {RANGES.map(([r, label]) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--r-sm)',
              background: range === r ? 'var(--accent)' : 'var(--bg2)',
              color: range === r ? '#fff' : 'var(--tx2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Line
          key={`${theme}-${range}`}
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (c) => ` ${formatEur(Number(c.parsed.y))}` } },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: t.tick, font: { size: 10 }, maxTicksLimit: 8 },
              },
              y: {
                grid: { color: t.grid },
                ticks: {
                  color: t.tick,
                  font: { size: 10 },
                  callback: (v) => formatEur(Number(v)),
                },
              },
            },
          }}
        />
      </div>
    </div>
  )
}
