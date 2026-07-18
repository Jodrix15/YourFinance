import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { Doughnut } from 'react-chartjs-2'
import {
  useActualizarDeuda,
  useCrearDeuda,
  useDeudas,
  useEliminarDeuda,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { notifyOk, notifyError } from '@/lib/notify'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import type { DeudaResponse, Frecuencia } from '@/types/api'
import s from './Deudas.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

// Meses desde hoy hasta la fecha de vencimiento (0 si no hay fecha o ya pasó)
function monthsUntil(dateStr: string | null): number {
  if (!dateStr) return 0
  const now = new Date()
  const due = new Date(dateStr)
  return (
    (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth())
  )
}

type Mode = 'nueva' | 'actualizar'

const EMPTY = {
  nombre: '',
  acreedor: '',
  importe: '',
  interesPct: '',
  pagada: '',
  cuota: '',
  frecuencia: 'MENSUAL',
  vencimiento: '',
}

export default function Deudas() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: deudas, isLoading, isError, error } = useDeudas()
  const crearDeuda = useCrearDeuda()
  const actualizarDeuda = useActualizarDeuda()
  const eliminarDeuda = useEliminarDeuda()

  const [mode, setMode] = useState<Mode>('nueva')
  const [selId, setSelId] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [formErr, setFormErr] = useState<string | null>(null)

  const formRef = useRef<HTMLDivElement>(null)
  function irAlFormulario() {
    switchMode('nueva')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(
      () => formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }),
      350,
    )
  }

  // Arrastrar-para-desplazar la fila de tarjetas de deuda
  const gridRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, startX: 0, scrollLeft: 0 })
  function onGridDown(e: ReactMouseEvent) {
    const el = gridRef.current
    if (!el) return
    drag.current = { down: true, startX: e.pageX, scrollLeft: el.scrollLeft }
    el.classList.add(s.dragging)
  }
  function onGridMove(e: ReactMouseEvent) {
    if (!drag.current.down || !gridRef.current) return
    e.preventDefault()
    gridRef.current.scrollLeft = drag.current.scrollLeft - (e.pageX - drag.current.startX)
  }
  function endGridDrag() {
    if (!drag.current.down) return
    drag.current.down = false
    gridRef.current?.classList.remove(s.dragging)
  }

  // Al elegir una deuda en "Actualizar", precargamos sus datos.
  useEffect(() => {
    if (mode !== 'actualizar' || !selId || !deudas) return
    const d = deudas.find((x) => x.id === Number(selId))
    if (d) {
      setForm({
        nombre: d.nombreDeuda,
        acreedor: d.acreedor,
        importe: String(d.importe ?? ''),
        interesPct: d.interes != null ? String(d.interes) : '',
        pagada: String(d.cantidadPagada ?? ''),
        cuota: d.cuota != null ? String(d.cuota) : '',
        frecuencia: d.frecuencia ?? 'MENSUAL',
        vencimiento: d.fechaVencimiento ?? '',
      })
    }
  }, [selId, mode, deudas])

  if (isLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={140} height={26} />
          <Skeleton width={320} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className={s.kpis}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={s.kpi}>
              <Skeleton width={90} height={11} />
              <Skeleton width={110} height={24} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className={`card ${s.cardBlock}`}>
          <Skeleton width={120} height={13} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={340} height={168} radius="var(--r-lg)" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const list: DeudaResponse[] = deudas ?? []
  const totalPendiente = sum(list.map((d) => d.cantidadPendiente))
  const totalPagado = sum(list.map((d) => d.cantidadPagada))
  const totalConIntereses = sum(list.map((d) => d.importeTotal))

  // Gasto mensual estimado: suma de (pendiente / meses hasta vencimiento) de las deudas con fecha futura.
  const gastoMensual = list.reduce((acc, d) => {
    const m = monthsUntil(d.fechaVencimiento)
    return m > 0 ? acc + Number(d.cantidadPendiente || 0) / m : acc
  }, 0)

  const t = chartTheme()

  const doughnut = {
    labels: list.map((d) => d.nombreDeuda),
    datasets: [
      {
        data: list.map((d) => Number(d.cantidadPendiente || 0)),
        backgroundColor: list.map((_, idx) => PALETTE[idx % PALETTE.length]),
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function switchMode(m: Mode) {
    setMode(m)
    setFormErr(null)
    setSelId('')
    setForm({ ...EMPTY })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const selDebt =
      mode === 'actualizar' ? list.find((d) => d.id === Number(selId)) : undefined
    // En "Actualizar" el nombre es opcional: si se deja vacío, se conserva el actual.
    const nombre = form.nombre.trim() || selDebt?.nombreDeuda || ''
    const acreedor = form.acreedor.trim()
    const importe = num(form.importe)
    if (!nombre) return setFormErr('Indica el nombre de la deuda.')
    if (!acreedor) return setFormErr('Indica el acreedor.')
    if (Number.isNaN(importe) || importe <= 0)
      return setFormErr('El importe debe ser mayor que 0.')

    const interesPct = num(form.interesPct)
    const pagada = num(form.pagada)
    const cuota = num(form.cuota)
    const body = {
      nombreDeuda: nombre,
      importe,
      acreedor,
      cantidadPagada: Number.isNaN(pagada) ? 0 : pagada,
      // Cuota mensual/anual real de la deuda (0 si no se indica).
      cuota: Number.isNaN(cuota) ? 0 : cuota,
      frecuencia: form.frecuencia as Frecuencia,
      // El interés se guarda como porcentaje (4,5 = 4,5%), se envía tal cual.
      interes: Number.isNaN(interesPct) ? undefined : interesPct,
      fechaVencimiento: form.vencimiento || null,
    }

    try {
      if (mode === 'nueva') {
        await crearDeuda.mutateAsync(body)
        notifyOk('Deuda creada')
      } else {
        if (!selId) return setFormErr('Selecciona una deuda.')
        await actualizarDeuda.mutateAsync({ id: Number(selId), ...body })
        notifyOk('Deuda actualizada')
      }
      switchMode(mode)
    } catch (err) {
      setFormErr(apiErrorMessage(err))
      notifyError(err)
    }
  }

  async function deleteDeuda(d: DeudaResponse) {
    const ok = await confirm({
      title: 'Eliminar deuda',
      message: (
        <>
          ¿Seguro que quieres eliminar la deuda <strong>{d.nombreDeuda}</strong>?
          Esta acción no se puede deshacer.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminarDeuda.mutateAsync(d.id)
      notifyOk('Deuda eliminada')
      if (Number(selId) === d.id) switchMode('actualizar')
    } catch (err) {
      notifyError(err)
    }
  }

  const saving =
    crearDeuda.isPending || actualizarDeuda.isPending || eliminarDeuda.isPending

  return (
    <div>
      <div className={s.header}>
        <h1>Deudas</h1>
        <p>Controla lo que debes, a quién y cuánto te queda por pagar</p>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Deuda pendiente</div>
          <div className={s.kpiValue} style={{ color: 'var(--down)' }}>
            {formatEur(totalPendiente)}
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total pagado</div>
          <div className={s.kpiValue} style={{ color: 'var(--up)' }}>
            {formatEur(totalPagado)}
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total con intereses</div>
          <div className={s.kpiValue}>{formatEur(totalConIntereses)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Gasto mensual estimado</div>
          <div className={s.kpiValue}>{formatEur(gastoMensual)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Nº de deudas</div>
          <div className={s.kpiValue}>{list.length}</div>
        </div>
      </div>

      {list.length > 0 && (
        <div className={s.charts}>
          <div className="card">
            <div className="sec-title">Reparto de deuda pendiente</div>
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
        </div>
      )}

      <div className={`card ${s.cardBlock}`}>
        <div className="sec-title">Mis deudas</div>
        {list.length === 0 ? (
          <EmptyState
            message="No tienes deudas registradas. Añade la primera para llevar el control de lo que debes."
            actionLabel="Añadir tu primera deuda"
            onAction={irAlFormulario}
          />
        ) : (
          <div
            className={s.debtGrid}
            ref={gridRef}
            onMouseDown={onGridDown}
            onMouseMove={onGridMove}
            onMouseUp={endGridDrag}
            onMouseLeave={endGridDrag}
          >
            {list.map((d) => {
              const totalDeuda = Number(d.importeTotal || 0)
              const pagado = Number(d.cantidadPagada || 0)
              const pct = totalDeuda > 0 ? Math.min(100, (pagado / totalDeuda) * 100) : 0
              const year = d.fechaVencimiento ? d.fechaVencimiento.slice(0, 4) : null
              return (
                <div key={d.id} className={s.debtCard}>
                  <div className={s.debtTop}>
                    <div>
                      <div className={s.debtName}>{d.nombreDeuda}</div>
                      <div className={s.debtAcreedor}>{d.acreedor}</div>
                    </div>
                    {d.interes != null && (
                      <span className={s.badge}>{formatPct(d.interes)} TAE</span>
                    )}
                  </div>
                  <div className={s.debtAmount}>{formatEur(d.cantidadPendiente)}</div>
                  <div className={s.debtMeta}>
                    {year ? `Finaliza en ${year}` : 'Sin fecha de vencimiento'}
                  </div>
                  <div className={s.progressTrack}>
                    <div className={s.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={s.debtFooter}>
                    <span>Pagado {Math.round(pct)}%</span>
                    <span>Total {formatEur(totalDeuda)}</span>
                  </div>
                  <button
                    type="button"
                    className={s.cardDeleteBtn}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => deleteDeuda(d)}
                    disabled={saving}
                  >
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div ref={formRef} className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`}
            onClick={() => switchMode('nueva')}
          >
            Nueva deuda
          </button>
          <button
            type="button"
            className={`${s.tab} ${mode === 'actualizar' ? s.tabActive : ''}`}
            onClick={() => switchMode('actualizar')}
          >
            Actualizar
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'actualizar' && (
            <div className={s.row}>
              <div className={s.field}>
                <label>Deuda a actualizar</label>
                <select value={selId} onChange={(e) => setSelId(e.target.value)}>
                  <option value="">Selecciona</option>
                  {list.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombreDeuda} — {d.acreedor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(mode === 'nueva' || selId) && (
            <>
              <div className={s.row}>
                <div className={s.field}>
                  <label>{mode === 'actualizar' ? 'Nombre (opcional)' : 'Nombre'}</label>
                  <input
                    type="text"
                    placeholder="Ej: Hipoteca"
                    value={form.nombre}
                    onChange={(e) => set('nombre', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label>Acreedor</label>
                  <input
                    type="text"
                    placeholder="Ej: BBVA"
                    value={form.acreedor}
                    onChange={(e) => set('acreedor', e.target.value)}
                  />
                </div>
              </div>
              <div className={s.row}>
                <div className={s.field}>
                  <label>Importe (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.importe}
                    onChange={(e) => set('importe', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label>Interés (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 5"
                    value={form.interesPct}
                    onChange={(e) => set('interesPct', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label>Cantidad pagada (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.pagada}
                    onChange={(e) => set('pagada', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label>Vencimiento</label>
                  <input
                    type="date"
                    value={form.vencimiento}
                    onChange={(e) => set('vencimiento', e.target.value)}
                  />
                </div>
              </div>
              <div className={s.row}>
                <div className={s.field}>
                  <label>Cuota (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.cuota}
                    onChange={(e) => set('cuota', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label>Frecuencia de la cuota</label>
                  <select
                    value={form.frecuencia}
                    onChange={(e) => set('frecuencia', e.target.value)}
                  >
                    <option value="MENSUAL">Mensual</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
              </div>
              <p className={s.hint}>
                El total con intereses y lo pendiente se calculan solos a partir del
                importe, el interés y lo pagado.
              </p>
              {formErr && <p className={s.error}>{formErr}</p>}
              <button className={s.btn} type="submit" disabled={saving} style={{ marginTop: 4 }}>
                {saving
                  ? 'Guardando…'
                  : mode === 'nueva'
                    ? 'Añadir deuda'
                    : 'Actualizar deuda'}
              </button>
            </>
          )}

          {mode === 'actualizar' && list.length === 0 && (
            <p className={s.hint}>No tienes deudas que actualizar todavía.</p>
          )}
          {mode === 'actualizar' && formErr && !selId && (
            <p className={s.error}>{formErr}</p>
          )}
        </form>
      </div>
    </div>
  )
}
