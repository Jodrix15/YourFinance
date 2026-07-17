import { useMemo, useState, type FormEvent } from 'react'
import { Line } from 'react-chartjs-2'
import {
  useActualizarRecurrente,
  useCategorias,
  useCrearCategoria,
  useCrearRecurrente,
  useEliminarRecurrente,
  useNuevoPrecioRecurrente,
  useRecurrentes,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import Modal from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import { notifyOk, notifyError } from '@/lib/notify'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import type { Frecuencia, GastoRecurrenteResponse } from '@/types/api'
import s from './Suscripciones.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)
const today = () => new Date().toISOString().slice(0, 10)

// Coste mensual normalizado (anual → /12)
function mensual(sub: GastoRecurrenteResponse): number {
  const imp = Number(sub.importeActual || 0)
  return sub.frecuencia === 'ANUAL' ? imp / 12 : imp
}

type Mode = 'nueva' | 'actualizar'

const EMPTY = {
  nombre: '',
  catName: '',
  frecuencia: 'MENSUAL' as Frecuencia,
  importe: '',
  fechaPrimerPago: today(),
  active: true,
}

export default function Suscripciones() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: recurrentes, isLoading, isError, error } = useRecurrentes()
  const { data: categorias } = useCategorias()

  const crearRecurrente = useCrearRecurrente()
  const actualizarRecurrente = useActualizarRecurrente()
  const nuevoPrecio = useNuevoPrecioRecurrente()
  const eliminarRecurrente = useEliminarRecurrente()
  const crearCategoria = useCrearCategoria()

  const gastoCats = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === 'GASTO'),
    [categorias],
  )

  const [mode, setMode] = useState<Mode>('nueva')
  const [selId, setSelId] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [formErr, setFormErr] = useState<string | null>(null)
  const [detailSub, setDetailSub] = useState<GastoRecurrenteResponse | null>(null)

  if (isLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={180} height={26} />
          <Skeleton width={340} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className={s.kpis}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.kpi}>
              <Skeleton width={90} height={11} />
              <Skeleton width={110} height={24} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className={`card ${s.cardBlock}`}>
          <Skeleton width={160} height={13} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={260} height={150} radius="var(--r-lg)" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const subs = (recurrentes ?? []).filter((r) => r.tipoPago === 'SUSCRIPCION')
  const activas = subs.filter((r) => r.active)
  const gastoMensual = sum(activas.map(mensual))
  const gastoAnual = gastoMensual * 12

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function switchMode(m: Mode) {
    setMode(m)
    setFormErr(null)
    setSelId('')
    setForm({ ...EMPTY })
  }

  function loadSub(id: string) {
    setSelId(id)
    const sub = subs.find((x) => x.id === Number(id))
    if (sub) {
      setForm({
        nombre: sub.nombre,
        catName: sub.categoriaNombre ?? '',
        frecuencia: sub.frecuencia,
        importe: sub.importeActual != null ? String(sub.importeActual) : '',
        fechaPrimerPago: sub.fechaPrimerPago ?? today(),
        active: sub.active,
      })
    }
  }

  async function resolverCategoriaId(name: string): Promise<number> {
    const existing = gastoCats.find((c) => c.nombre.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id
    const created = await crearCategoria.mutateAsync({ nombre: name, tipo: 'GASTO' })
    return created.id
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const nombre = form.nombre.trim()
    const catName = form.catName.trim()
    const importe = num(form.importe)
    if (!nombre) return setFormErr('Indica el nombre de la suscripción.')
    if (!catName) return setFormErr('Indica una categoría.')
    if (Number.isNaN(importe) || importe <= 0)
      return setFormErr('El importe debe ser mayor que 0.')
    if (!form.fechaPrimerPago) return setFormErr('Indica la fecha del primer pago.')

    try {
      const categoriaId = await resolverCategoriaId(catName)
      if (mode === 'nueva') {
        await crearRecurrente.mutateAsync({
          nombre,
          categoriaId,
          tipoPago: 'SUSCRIPCION',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          fechaUltimoPago: form.fechaPrimerPago,
          active: form.active,
          importeInicial: importe,
        })
      } else {
        if (!selId) return setFormErr('Selecciona una suscripción.')
        const sub = subs.find((x) => x.id === Number(selId))
        await actualizarRecurrente.mutateAsync({
          id: Number(selId),
          nombre,
          categoriaId,
          tipoPago: 'SUSCRIPCION',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          fechaUltimoPago: sub?.fechaUltimoPago ?? form.fechaPrimerPago,
          active: form.active,
        })
        if (sub && Number(sub.importeActual || 0) !== importe) {
          await nuevoPrecio.mutateAsync({
            id: Number(selId),
            importe,
            fechaVariacionImporte: today(),
          })
        }
      }
      notifyOk(mode === 'nueva' ? 'Suscripción creada' : 'Suscripción actualizada')
      switchMode(mode)
    } catch (err) {
      setFormErr(apiErrorMessage(err))
      notifyError(err)
    }
  }

  async function deleteSub(sub: GastoRecurrenteResponse) {
    const ok = await confirm({
      title: 'Eliminar suscripción',
      message: (
        <>
          ¿Seguro que quieres eliminar <strong>{sub.nombre}</strong>? Esta acción
          no se puede deshacer.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminarRecurrente.mutateAsync(sub.id)
      notifyOk('Suscripción eliminada')
      if (Number(selId) === sub.id) switchMode('actualizar')
    } catch (err) {
      notifyError(err)
    }
  }

  const saving =
    crearRecurrente.isPending ||
    actualizarRecurrente.isPending ||
    nuevoPrecio.isPending ||
    eliminarRecurrente.isPending ||
    crearCategoria.isPending

  // ── Modal de historial ──
  const t = chartTheme()
  const hist = detailSub?.historial ?? []
  // Cada cambio de precio: valor anterior, valor nuevo y diferencia.
  const changes = hist.slice(1).map((h, i) => {
    const antes = Number(hist[i].importe || 0)
    const despues = Number(h.importe || 0)
    return { fecha: h.fechaVariacionImporte, antes, despues, diff: despues - antes }
  })
  const lineData = {
    labels: hist.map((h) => h.fechaVariacionImporte),
    datasets: [
      {
        label: 'Precio (€)',
        data: hist.map((h) => Number(h.importe || 0)),
        borderColor: '#2f81f7',
        backgroundColor: 'rgba(47, 129, 247, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: '#2f81f7',
      },
    ],
  }

  return (
    <div>
      <div className={s.header}>
        <h1>Suscripciones</h1>
        <p>Controla tus suscripciones activas y cuánto te cuestan al mes</p>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Gasto mensual</div>
          <div className={s.kpiValue}>{formatEur(gastoMensual, true)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Gasto anual</div>
          <div className={s.kpiValue}>{formatEur(gastoAnual)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Activas</div>
          <div className={s.kpiValue}>{activas.length}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total</div>
          <div className={s.kpiValue}>{subs.length}</div>
        </div>
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className="sec-title">Mis suscripciones</div>
        {subs.length === 0 ? (
          <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
            No tienes suscripciones registradas. Añade una con el formulario de abajo.
          </p>
        ) : (
          <div className={s.subGrid}>
            {subs.map((r) => (
              <div
                key={r.id}
                className={`${s.subCard} ${r.active ? '' : s.inactive}`}
                onClick={() => setDetailSub(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDetailSub(r)}
              >
                <div className={s.subTop}>
                  <div>
                    <div className={s.subName}>{r.nombre}</div>
                    <div className={s.subCat}>{r.categoriaNombre ?? '—'}</div>
                  </div>
                  <span className={r.active ? s.badgeOn : s.badgeOff}>
                    {r.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className={s.subPrice}>
                  {formatEur(r.importeActual, true)}{' '}
                  <span>/{r.frecuencia === 'ANUAL' ? 'año' : 'mes'}</span>
                </div>
                <div className={s.subMeta}>Próximo pago: {r.fechaProximoPago ?? '—'}</div>
                <div className={s.clickHint}>Clic para ver el historial de precios →</div>
                <button
                  type="button"
                  className={s.cardDeleteBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSub(r)
                  }}
                  disabled={saving}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`}
            onClick={() => switchMode('nueva')}
          >
            Nueva suscripción
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
                <label>Suscripción a actualizar</label>
                <select value={selId} onChange={(e) => loadSub(e.target.value)}>
                  <option value="">Selecciona</option>
                  {subs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
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
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Ej: Netflix"
                    value={form.nombre}
                    onChange={(e) => set('nombre', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label>Categoría</label>
                  <input
                    type="text"
                    list="sub-cats"
                    placeholder="Ej: Streaming"
                    value={form.catName}
                    onChange={(e) => set('catName', e.target.value)}
                  />
                  <datalist id="sub-cats">
                    {gastoCats.map((c) => (
                      <option key={c.id} value={c.nombre} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className={s.row}>
                <div className={s.field}>
                  <label>Frecuencia</label>
                  <select
                    value={form.frecuencia}
                    onChange={(e) => set('frecuencia', e.target.value as Frecuencia)}
                  >
                    <option value="MENSUAL">Mensual</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
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
                  <label>Fecha primer pago</label>
                  <input
                    type="date"
                    value={form.fechaPrimerPago}
                    onChange={(e) => set('fechaPrimerPago', e.target.value)}
                  />
                </div>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => set('active', e.target.checked)}
                  />
                  Activa
                </label>
              </div>
              <p className={s.hint}>
                Si la categoría no existe, se crea automáticamente (tipo Gasto). Al
                actualizar, si cambias el importe se registra como nueva variación de precio.
              </p>
              {formErr && <p className={s.error}>{formErr}</p>}
              <button className={s.btn} type="submit" disabled={saving} style={{ marginTop: 4 }}>
                {saving
                  ? 'Guardando…'
                  : mode === 'nueva'
                    ? 'Añadir suscripción'
                    : 'Actualizar suscripción'}
              </button>
            </>
          )}
        </form>
      </div>

      <Modal open={detailSub !== null} onClose={() => setDetailSub(null)} maxWidth={560}>
        {detailSub && (
          <>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalTitle}>{detailSub.nombre}</div>
              </div>
              <button
                className={s.closeBtn}
                onClick={() => setDetailSub(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className={s.modalSub}>
              Historial de precios · {detailSub.categoriaNombre ?? 'Sin categoría'}
            </div>

            {hist.length === 0 ? (
              <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
                No hay historial de precios para esta suscripción todavía.
              </p>
            ) : (
              <>
                <div className={s.histChart}>
                  <Line
                    key={`line-${theme}-${detailSub.id}`}
                    data={lineData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (c) => ` ${formatEur(Number(c.parsed.y), true)}`,
                          },
                        },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                        y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 } } },
                      },
                    }}
                  />
                </div>
                {changes.length === 0 ? (
                  <p className={s.hint}>
                    Precio inicial {formatEur(hist[0].importe, true)} · sin subidas registradas.
                  </p>
                ) : (
                  <table className={s.histTable}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Valor anterior</th>
                        <th>Valor nuevo</th>
                        <th>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((c, i) => (
                        <tr key={i}>
                          <td>{c.fecha}</td>
                          <td>{formatEur(c.antes, true)}</td>
                          <td>{formatEur(c.despues, true)}</td>
                          <td style={{ color: c.diff >= 0 ? 'var(--down)' : 'var(--up)' }}>
                            {c.diff >= 0 ? '+' : '−'}
                            {formatEur(Math.abs(c.diff), true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
