import { useMemo, useState, type FormEvent } from 'react'
import {
  useActualizarTransaccion,
  useCategorias,
  useCrearCategoria,
  useCrearTransaccion,
  useEliminarTransaccion,
  useTransacciones,
} from '@/hooks/useFinance'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import type { CuentaResponse, TipoMovimiento, TransaccionResponse } from '@/types/api'
import s from '@/pages/Movimientos.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)
const today = () => new Date().toISOString().slice(0, 10)

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const NOW = new Date()
const CUR_MES = String(NOW.getMonth() + 1).padStart(2, '0')
const CUR_ANIO = String(NOW.getFullYear())
const TIPOS: TipoMovimiento[] = ['GASTO', 'INGRESO']
const TIPO_LABEL: Record<TipoMovimiento, string> = { GASTO: 'Gasto', INGRESO: 'Ingreso', INVERSION: 'Inversión' }
const BADGE: Record<TipoMovimiento, string> = { GASTO: 'bGasto', INGRESO: 'bIngreso', INVERSION: 'bInversion' }
const esNegativo = (t: TipoMovimiento) => t === 'GASTO' || t === 'INVERSION'

type Mode = 'nueva' | 'actualizar'
const EMPTY = { tipo: 'GASTO' as TipoMovimiento, catName: '', importe: '', descripcion: '', fecha: today() }

interface Props { cuenta: CuentaResponse; onBack: () => void }

export default function AccountMovimientos({ cuenta, onBack }: Props) {
  const { data: movs, isLoading, isError, error } = useTransacciones(cuenta.id)
  const { data: categorias } = useCategorias()
  const confirm = useConfirm()
  const crear = useCrearTransaccion()
  const actualizar = useActualizarTransaccion()
  const eliminar = useEliminarTransaccion()
  const crearCategoria = useCrearCategoria()

  const [fTipo, setFTipo] = useState<'TODOS' | TipoMovimiento>('TODOS')
  const [fMes, setFMes] = useState(CUR_MES)
  const [fAnio, setFAnio] = useState(CUR_ANIO)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<Mode>('nueva')
  const [selId, setSelId] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [formErr, setFormErr] = useState<string | null>(null)

  const catsDelTipo = useMemo(() => (categorias ?? []).filter((c) => c.tipo === form.tipo), [categorias, form.tipo])
  const anios = useMemo(
    () => [...new Set([...(movs ?? []).map((m) => (m.fechaTransaccion ?? '').slice(0, 4)).filter(Boolean), CUR_ANIO])].sort().reverse(),
    [movs],
  )
  const movsOrdenados = useMemo(
    () => [...(movs ?? [])].sort((a, b) => (b.fechaTransaccion ?? '').localeCompare(a.fechaTransaccion ?? '')),
    [movs],
  )
  const filtered = useMemo(() => {
    const list = movs ?? []
    const q = search.trim().toLowerCase()
    return list
      .filter((m) => fTipo === 'TODOS' || m.tipoMovimiento === fTipo)
      .filter((m) => {
        const f = m.fechaTransaccion ?? ''
        return (fAnio === '' || f.slice(0, 4) === fAnio) && (fMes === '' || f.slice(5, 7) === fMes)
      })
      .filter((m) => !q || (m.descripcion ?? '').toLowerCase().includes(q) || (m.categoriaNombre ?? '').toLowerCase().includes(q))
      .sort((a, b) => (b.fechaTransaccion ?? '').localeCompare(a.fechaTransaccion ?? ''))
  }, [movs, fTipo, fMes, fAnio, search])

  if (isLoading) {
    return (
      <div>
        <div className={s.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Skeleton width={180} height={24} />
            <Skeleton width={200} height={13} style={{ marginTop: 6 }} />
          </div>
          <Skeleton width={90} height={32} radius="var(--r-md)" />
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
          <Skeleton width={140} height={13} style={{ marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={34} style={{ marginBottom: 8 }} />
          ))}
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const ingresos = sum(filtered.filter((m) => m.tipoMovimiento === 'INGRESO').map((m) => m.importe))
  const gastos = sum(filtered.filter((m) => m.tipoMovimiento === 'GASTO').map((m) => m.importe))
  const diferencia = ingresos - gastos

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((f) => ({ ...f, [key]: value })) }

  function resetForm() {
    setSelId('')
    setForm({ ...EMPTY })
    setFormErr(null)
  }
  function switchMode(m: Mode) {
    setMode(m)
    resetForm()
  }
  function prefill(m: TransaccionResponse) {
    setForm({ tipo: m.tipoMovimiento, catName: m.categoriaNombre ?? '', importe: String(m.importe ?? ''), descripcion: m.descripcion ?? '', fecha: m.fechaTransaccion ?? today() })
  }
  function loadTransaccion(id: string) {
    setSelId(id)
    setFormErr(null)
    const m = (movs ?? []).find((x) => x.id === Number(id))
    if (m) prefill(m)
    else setForm({ ...EMPTY })
  }
  // Clic en una fila del historial → abre "Actualizar" con esa transacción cargada.
  function startEdit(m: TransaccionResponse) {
    setMode('actualizar')
    setSelId(String(m.id))
    setFormErr(null)
    prefill(m)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  async function handleDelete() {
    if (!selId) return
    const ok = await confirm({
      title: 'Eliminar movimiento',
      message: '¿Seguro que quieres eliminar este movimiento? No se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync({ cuentaId: cuenta.id, id: Number(selId) })
      notifyOk('Movimiento eliminado')
      resetForm()
    } catch (err) {
      notifyError(err)
    }
  }

  async function resolverCategoriaId(name: string): Promise<number> {
    const existing = catsDelTipo.find((c) => c.nombre.toLowerCase() === name.trim().toLowerCase())
    if (existing) return existing.id
    const created = await crearCategoria.mutateAsync({ nombre: name.trim(), tipo: form.tipo })
    return created.id
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const importe = num(form.importe)
    const catName = form.catName.trim()
    if (mode === 'actualizar' && !selId) return setFormErr('Selecciona una transacción.')
    if (!catName) return setFormErr('Indica una categoría.')
    if (Number.isNaN(importe) || importe <= 0) return setFormErr('El importe debe ser mayor que 0.')
    if (!form.fecha) return setFormErr('Indica la fecha.')
    try {
      const categoriaId = await resolverCategoriaId(catName)
      const dto = { tipoMovimiento: form.tipo, categoriaId, importe, descripcion: form.descripcion.trim() || undefined, fecha: form.fecha }
      if (mode === 'actualizar') {
        await actualizar.mutateAsync({ cuentaId: cuenta.id, id: Number(selId), ...dto })
        notifyOk('Transacción actualizada')
      } else {
        await crear.mutateAsync({ cuentaId: cuenta.id, ...dto })
        notifyOk('Transacción añadida')
      }
      resetForm()
    } catch (err) {
      setFormErr(apiErrorMessage(err))
      notifyError(err)
    }
  }

  const saving = crear.isPending || actualizar.isPending || crearCategoria.isPending || eliminar.isPending
  const tipoOptions: TipoMovimiento[] = form.tipo === 'INVERSION' ? [...TIPOS, 'INVERSION'] : TIPOS

  return (
    <div>
      <div className={s.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div><h1 style={{ marginBottom: 0 }}>{cuenta.nombreCuenta}</h1><p style={{ marginTop: 2 }}>Movimientos de esta cuenta</p></div>
        <button type="button" className={s.btnGhost} onClick={onBack}>← Cuentas</button>
      </div>
      <div className={s.kpis}>
        <div className={s.kpi}><div className={s.kpiLabel}>Saldo actual</div><div className={s.kpiValue}>{formatEur(cuenta.importe)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Ingresos</div><div className={s.kpiValue} style={{ color: 'var(--up)' }}>{formatEur(ingresos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Gastos</div><div className={s.kpiValue} style={{ color: 'var(--down)' }}>{formatEur(gastos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Diferencia</div><div className={s.kpiValue} style={{ color: diferencia >= 0 ? 'var(--up)' : 'var(--down)' }}>{formatEur(diferencia)}</div></div>
      </div>
      <div className={`card ${s.cardBlock}`}>
        <div className={s.cardHead}>
          <div className="sec-title" style={{ marginBottom: 0 }}>Historial ({filtered.length})</div>
          <div className={s.filters}>
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="TODOS">Todos los tipos</option>
              {TIPOS.map((t) => (<option key={t} value={t}>{TIPO_LABEL[t]}</option>))}
            </select>
            <select value={fMes} onChange={(e) => setFMes(e.target.value)}>
              <option value="">Todos los meses</option>
              {MESES.map((mes, idx) => (<option key={mes} value={String(idx + 1).padStart(2, '0')}>{mes}</option>))}
            </select>
            <select value={fAnio} onChange={(e) => setFAnio(e.target.value)}>
              <option value="">Todos los años</option>
              {anios.map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
            <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className={s.empty}>No hay movimientos con estos filtros.</p>
        ) : (
          <table className={s.movTable}>
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Tipo</th><th>Importe</th></tr></thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} onClick={() => startEdit(m)}>
                  <td>{m.fechaTransaccion ?? '—'}</td>
                  <td>{m.descripcion || '—'}</td>
                  <td>{m.categoriaNombre ?? '—'}</td>
                  <td><span className={`${s.badge} ${s[BADGE[m.tipoMovimiento]]}`}>{TIPO_LABEL[m.tipoMovimiento]}</span></td>
                  <td className={s.amount} style={{ color: esNegativo(m.tipoMovimiento) ? 'var(--down)' : 'var(--up)' }}>{esNegativo(m.tipoMovimiento) ? '−' : '+'}{formatEur(m.importe, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button type="button" className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`} onClick={() => switchMode('nueva')}>Nueva transacción</button>
          <button type="button" className={`${s.tab} ${mode === 'actualizar' ? s.tabActive : ''}`} onClick={() => switchMode('actualizar')}>Actualizar</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'actualizar' && (
            <div className={s.row}>
              <div className={s.field}>
                <label>Transacción a actualizar</label>
                <select value={selId} onChange={(e) => loadTransaccion(e.target.value)}>
                  <option value="">Selecciona</option>
                  {movsOrdenados.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fechaTransaccion} · {m.descripcion || TIPO_LABEL[m.tipoMovimiento]} · {esNegativo(m.tipoMovimiento) ? '−' : '+'}{formatEur(m.importe, true)}
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
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoMovimiento)}>
                    {tipoOptions.map((t) => (<option key={t} value={t}>{TIPO_LABEL[t]}</option>))}
                  </select>
                </div>
                <div className={s.field}>
                  <label>Categoría</label>
                  <input type="text" list="mov-cats" placeholder="Ej: Alimentación" value={form.catName} onChange={(e) => set('catName', e.target.value)} />
                  <datalist id="mov-cats">{catsDelTipo.map((c) => (<option key={c.id} value={c.nombre} />))}</datalist>
                </div>
              </div>
              <div className={s.row}>
                <div className={s.field}><label>Importe (€)</label><input type="number" step="0.01" min="0" placeholder="0,00" value={form.importe} onChange={(e) => set('importe', e.target.value)} /></div>
                <div className={s.field}><label>Fecha</label><input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
                <div className={s.field}><label>Descripción</label><input type="text" placeholder="Opcional" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></div>
              </div>
              <p className={s.hint}>
                Si la categoría no existe, se crea automáticamente con el tipo elegido. También puedes hacer clic en una fila del historial para editarla.
              </p>
              {formErr && <p className={s.error}>{formErr}</p>}
              <div className={s.actions} style={{ marginTop: 4 }}>
                <button className={s.btn} type="submit" disabled={saving}>{saving ? 'Guardando…' : mode === 'nueva' ? 'Añadir transacción' : 'Guardar cambios'}</button>
                {mode === 'actualizar' && selId && (
                  <button type="button" onClick={handleDelete} disabled={saving} style={{ padding: '9px 16px', fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--down)', border: '1px solid var(--down)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>Eliminar</button>
                )}
              </div>
            </>
          )}

          {mode === 'actualizar' && !selId && (
            <p className={s.hint}>Selecciona una transacción para editarla o eliminarla.</p>
          )}
        </form>
      </div>
    </div>
  )
}
