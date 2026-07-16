import { useMemo, useState, type FormEvent } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  useActualizarInversion,
  useCategorias,
  useCrearCategoria,
  useCrearInversion,
  useInversiones,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import s from './Inversiones.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

type Mode = 'nueva' | 'actualizar'

export default function Inversiones() {
  const { theme } = useTheme()
  const { data: inversiones, isLoading, isError, error } = useInversiones()
  const { data: categorias } = useCategorias()

  const crearInversion = useCrearInversion()
  const actualizarInversion = useActualizarInversion()
  const crearCategoria = useCrearCategoria()

  const invCats = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === 'INVERSION'),
    [categorias],
  )

  const [mode, setMode] = useState<Mode>('nueva')
  const [formErr, setFormErr] = useState<string | null>(null)

  // Nueva inversión
  const [catName, setCatName] = useState('')
  const [aportado, setAportado] = useState('')
  const [total, setTotal] = useState('')

  // Actualizar
  const [updId, setUpdId] = useState('')
  const [updAportacion, setUpdAportacion] = useState('')
  const [updValor, setUpdValor] = useState('')

  if (isLoading) return <p style={{ color: 'var(--tx2)' }}>Cargando inversiones…</p>
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const list = inversiones ?? []
  const totalInvertido = sum(list.map((i) => i.capitalTotal))
  const totalAportado = sum(list.map((i) => i.capitalAportado))
  const plusvaliaTotal = totalInvertido - totalAportado
  const rentabilidad = totalAportado > 0 ? (plusvaliaTotal / totalAportado) * 100 : 0

  const t = chartTheme()
  const doughnut = {
    labels: list.map((i) => i.categoriaNombre ?? `#${i.id}`),
    datasets: [
      {
        data: list.map((i) => Number(i.capitalTotal || 0)),
        backgroundColor: list.map((_, idx) => PALETTE[idx % PALETTE.length]),
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }
  const bar = {
    labels: list.map((i) => i.categoriaNombre ?? `#${i.id}`),
    datasets: [
      {
        label: 'Plusvalía (€)',
        data: list.map((i) => Number(i.plusvalia || 0)),
        backgroundColor: list.map((i) =>
          Number(i.plusvalia || 0) >= 0 ? '#1d9e75' : '#f85149',
        ),
        borderRadius: 4,
      },
    ],
  }

  async function submitNueva(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const a = num(aportado)
    const tot = num(total)
    const name = catName.trim()
    if (!name) return setFormErr('Indica una categoría.')
    if (Number.isNaN(a) || a <= 0) return setFormErr('El capital aportado debe ser mayor que 0.')
    if (Number.isNaN(tot) || tot < 0) return setFormErr('El valor actual no es válido.')
    try {
      // Reutiliza la categoría si ya existe (por nombre); si no, la crea.
      const existing = invCats.find(
        (c) => c.nombre.toLowerCase() === name.toLowerCase(),
      )
      const categoriaId =
        existing?.id ??
        (await crearCategoria.mutateAsync({ nombre: name, tipo: 'INVERSION' })).id
      await crearInversion.mutateAsync({
        categoriaId,
        capitalAportado: a,
        capitalTotal: tot,
      })
      setCatName('')
      setAportado('')
      setTotal('')
    } catch (err) {
      setFormErr(apiErrorMessage(err))
    }
  }

  async function submitActualizar(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    if (!updId) return setFormErr('Selecciona una inversión.')
    const ap = num(updAportacion)
    const val = num(updValor)
    const hasAp = !Number.isNaN(ap)
    const hasVal = !Number.isNaN(val)
    if (!hasAp && !hasVal)
      return setFormErr('Indica una nueva aportación, un valor actual, o ambos.')
    if (hasAp && ap < 0) return setFormErr('La aportación no puede ser negativa.')
    if (hasVal && val < 0) return setFormErr('El valor actual no puede ser negativo.')
    try {
      await actualizarInversion.mutateAsync({
        id: Number(updId),
        ...(hasAp ? { aportacion: ap } : {}),
        ...(hasVal ? { valorActual: val } : {}),
      })
      setUpdAportacion('')
      setUpdValor('')
    } catch (err) {
      setFormErr(apiErrorMessage(err))
    }
  }

  const saving =
    crearInversion.isPending || crearCategoria.isPending || actualizarInversion.isPending

  return (
    <div>
      <div className={s.header}>
        <h1>Inversiones</h1>
        <p>Controla en qué categorías estás invirtiendo y su rentabilidad</p>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total invertido</div>
          <div className={s.kpiValue}>{formatEur(totalInvertido)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Capital aportado</div>
          <div className={s.kpiValue}>{formatEur(totalAportado)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Plusvalía total</div>
          <div
            className={s.kpiValue}
            style={{ color: plusvaliaTotal >= 0 ? 'var(--up)' : 'var(--down)' }}
          >
            {formatEur(plusvaliaTotal)}
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Rentabilidad media</div>
          <div
            className={s.kpiValue}
            style={{ color: rentabilidad >= 0 ? 'var(--up)' : 'var(--down)' }}
          >
            {formatPct(rentabilidad)}
          </div>
        </div>
      </div>

      {list.length > 0 && (
        <div className={s.charts}>
          <div className="card">
            <div className="sec-title">Distribución por categoría</div>
            <div className={s.chartBox}>
              <Doughnut
                key={`d-${theme}`}
                data={doughnut}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '62%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: t.tick, boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (c) => {
                          const arr = c.dataset.data as number[]
                          const tot = arr.reduce((a, b) => a + Number(b || 0), 0)
                          const pct = tot ? (Number(c.parsed) / tot) * 100 : 0
                          return ` ${c.label}: ${formatEur(c.parsed)} · ${formatPct(pct)}`
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="card">
            <div className="sec-title">Plusvalía por categoría</div>
            <div className={s.chartBox}>
              <Bar
                key={`b-${theme}`}
                data={bar}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (c) => {
                          const inv = list[c.dataIndex]
                          return ` Plusvalía: ${formatEur(Number(c.raw))} · ${formatPct(
                            inv ? inv.porcentajePlusvalia : null,
                          )}`
                        },
                      },
                    },
                  },
                  scales: {
                    x: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 } } },
                    y: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`card ${s.cardBlock}`}>
        <div className="sec-title">Mis inversiones</div>
        {list.length === 0 ? (
          <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
            Aún no tienes inversiones. Crea una con el formulario de abajo.
          </p>
        ) : (
          <table className={`tbl ${s.table}`}>
            <thead>
              <tr>
                <th>Categoría</th>
                <th className={s.center}>Aportado</th>
                <th className={s.center}>Valor actual</th>
                <th className={s.center}>Plusvalía</th>
                <th className={s.center}>%</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td>{i.categoriaNombre ?? `#${i.id}`}</td>
                  <td className={s.center}>{formatEur(i.capitalAportado, true)}</td>
                  <td className={s.center}>{formatEur(i.capitalTotal, true)}</td>
                  <td
                    className={s.center}
                    style={{ color: Number(i.plusvalia) >= 0 ? 'var(--up)' : 'var(--down)' }}
                  >
                    {formatEur(i.plusvalia, true)}
                  </td>
                  <td
                    className={s.center}
                    style={{ color: Number(i.porcentajePlusvalia) >= 0 ? 'var(--up)' : 'var(--down)' }}
                  >
                    {formatPct(i.porcentajePlusvalia)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`}
            onClick={() => {
              setMode('nueva')
              setFormErr(null)
            }}
          >
            Nueva inversión
          </button>
          <button
            type="button"
            className={`${s.tab} ${mode === 'actualizar' ? s.tabActive : ''}`}
            onClick={() => {
              setMode('actualizar')
              setFormErr(null)
            }}
          >
            Actualizar
          </button>
        </div>

        {mode === 'nueva' ? (
          <form onSubmit={submitNueva}>
            <div className={s.row}>
              <div className={s.field}>
                <label>Categoría</label>
                <input
                  type="text"
                  list="inv-cats"
                  placeholder="Ej: ETFs globales"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
                <datalist id="inv-cats">
                  {invCats.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </div>
              <div className={s.field}>
                <label>Capital aportado (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={aportado}
                  onChange={(e) => setAportado(e.target.value)}
                />
              </div>
              <div className={s.field}>
                <label>Valor actual (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>
            </div>
            <p className={s.hint}>
              Si la categoría no existe, se crea automáticamente (tipo Inversión).
            </p>
            {formErr && <p className={s.error}>{formErr}</p>}
            <button className={s.btn} type="submit" disabled={saving} style={{ marginTop: 4 }}>
              {saving ? 'Guardando…' : 'Añadir inversión'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitActualizar}>
            {list.length === 0 ? (
              <p className={s.hint}>No tienes inversiones que actualizar todavía.</p>
            ) : (
              <>
                <div className={s.row}>
                  <div className={s.field}>
                    <label>Categoría</label>
                    <select value={updId} onChange={(e) => setUpdId(e.target.value)}>
                      <option value="">Selecciona</option>
                      {list.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.categoriaNombre ?? `#${i.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={s.field}>
                    <label>Nueva aportación (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Opcional"
                      value={updAportacion}
                      onChange={(e) => setUpdAportacion(e.target.value)}
                    />
                  </div>
                  <div className={s.field}>
                    <label>Valor actual (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={updValor}
                      onChange={(e) => setUpdValor(e.target.value)}
                    />
                  </div>
                </div>
                <p className={s.hint}>
                  La aportación se suma al capital; el valor actual fija el total del momento (la plusvalía se calcula sola).
                </p>
                {formErr && <p className={s.error}>{formErr}</p>}
                <button className={s.btn} type="submit" disabled={saving} style={{ marginTop: 4 }}>
                  {saving ? 'Guardando…' : 'Actualizar inversión'}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
