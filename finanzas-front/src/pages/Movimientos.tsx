import { useMemo, useState, type FormEvent } from 'react'
import {
  useActualizarTransaccion,
  useCategorias,
  useCrearCategoria,
  useCrearTransaccion,
  useCuentas,
  useMovimientos,
} from '@/hooks/useFinance'
import Skeleton from '@/components/ui/Skeleton'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import type { Movimiento, TipoMovimiento } from '@/types/api'
import s from './Movimientos.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)
const today = () => new Date().toISOString().slice(0, 10)

// Tipos que se pueden crear/filtrar (INVERSION se gestiona en la sección Inversiones).
const TIPOS: TipoMovimiento[] = ['GASTO', 'INGRESO']
const TIPO_LABEL: Record<TipoMovimiento, string> = {
  GASTO: 'Gasto',
  INGRESO: 'Ingreso',
  INVERSION: 'Inversión',
}
const BADGE: Record<TipoMovimiento, string> = {
  GASTO: 'bGasto',
  INGRESO: 'bIngreso',
  INVERSION: 'bInversion',
}

function esNegativo(t: TipoMovimiento) {
  return t === 'GASTO' || t === 'INVERSION'
}

const EMPTY = {
  tipo: 'GASTO' as TipoMovimiento,
  cuentaId: '',
  catName: '',
  importe: '',
  descripcion: '',
  fecha: today(),
}

export default function Movimientos() {
  const { data: movs, isLoading, isError, error } = useMovimientos()
  const { data: cuentas } = useCuentas()
  const { data: categorias } = useCategorias()

  const crear = useCrearTransaccion()
  const actualizar = useActualizarTransaccion()
  const crearCategoria = useCrearCategoria()

  const [fTipo, setFTipo] = useState<'TODOS' | TipoMovimiento>('TODOS')
  const [fCuenta, setFCuenta] = useState<'TODAS' | string>('TODAS')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({ ...EMPTY })
  const [editing, setEditing] = useState<{ cuentaId: number; id: number } | null>(null)
  const [formErr, setFormErr] = useState<string | null>(null)

  const catsDelTipo = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo],
  )

  const filtered = useMemo(() => {
    const list = movs ?? []
    const q = search.trim().toLowerCase()
    return list
      .filter((m) => fTipo === 'TODOS' || m.tipoMovimiento === fTipo)
      .filter((m) => fCuenta === 'TODAS' || String(m.cuentaId) === fCuenta)
      .filter(
        (m) =>
          !q ||
          (m.descripcion ?? '').toLowerCase().includes(q) ||
          (m.categoriaNombre ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => (b.fechaTransaccion ?? '').localeCompare(a.fechaTransaccion ?? ''))
  }, [movs, fTipo, fCuenta, search])

  if (isLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={170} height={26} />
          <Skeleton width={360} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className={s.kpis}>
          {Array.from({ length: 3 }).map((_, i) => (
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

  const ingresos = sum(
    filtered.filter((m) => m.tipoMovimiento === 'INGRESO').map((m) => m.importe),
  )
  const gastos = sum(filtered.filter((m) => m.tipoMovimiento === 'GASTO').map((m) => m.importe))
  const inversiones = sum(
    filtered.filter((m) => m.tipoMovimiento === 'INVERSION').map((m) => m.importe),
  )
  const balance = ingresos - gastos - inversiones

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startEdit(m: Movimiento) {
    if (m.cuentaId == null) return
    setEditing({ cuentaId: m.cuentaId, id: m.id })
    setFormErr(null)
    setForm({
      tipo: m.tipoMovimiento,
      cuentaId: String(m.cuentaId),
      catName: m.categoriaNombre ?? '',
      importe: String(m.importe ?? ''),
      descripcion: m.descripcion ?? '',
      fecha: m.fechaTransaccion ?? today(),
    })
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditing(null)
    setForm({ ...EMPTY })
    setFormErr(null)
  }

  async function resolverCategoriaId(name: string): Promise<number> {
    const existing = catsDelTipo.find(
      (c) => c.nombre.toLowerCase() === name.trim().toLowerCase(),
    )
    if (existing) return existing.id
    const created = await crearCategoria.mutateAsync({ nombre: name.trim(), tipo: form.tipo })
    return created.id
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const importe = num(form.importe)
    const catName = form.catName.trim()
    if (!form.cuentaId) return setFormErr('Selecciona una cuenta.')
    if (!catName) return setFormErr('Indica una categoría.')
    if (Number.isNaN(importe) || importe <= 0)
      return setFormErr('El importe debe ser mayor que 0.')
    if (!form.fecha) return setFormErr('Indica la fecha.')

    try {
      const categoriaId = await resolverCategoriaId(catName)
      const dto = {
        tipoMovimiento: form.tipo,
        categoriaId,
        importe,
        descripcion: form.descripcion.trim() || undefined,
        fecha: form.fecha,
      }
      if (editing) {
        await actualizar.mutateAsync({ cuentaId: editing.cuentaId, id: editing.id, ...dto })
        notifyOk('Movimiento actualizado')
      } else {
        await crear.mutateAsync({ cuentaId: Number(form.cuentaId), ...dto })
        notifyOk('Movimiento añadido')
      }
      cancelEdit()
    } catch (err) {
      setFormErr(apiErrorMessage(err))
      notifyError(err)
    }
  }

  const saving = crear.isPending || actualizar.isPending || crearCategoria.isPending

  // Al editar un movimiento antiguo de tipo INVERSION, se mantiene esa opción visible.
  const tipoOptions: TipoMovimiento[] =
    form.tipo === 'INVERSION' ? [...TIPOS, 'INVERSION'] : TIPOS

  return (
    <div>
      <div className={s.header}>
        <h1>Movimientos</h1>
        <p>Registra y consulta todos tus ingresos, gastos e inversiones</p>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Ingresos</div>
          <div className={s.kpiValue} style={{ color: 'var(--up)' }}>
            {formatEur(ingresos)}
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Gastos</div>
          <div className={s.kpiValue} style={{ color: 'var(--down)' }}>
            {formatEur(gastos)}
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Balance</div>
          <div className={s.kpiValue} style={{ color: balance >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {formatEur(balance)}
          </div>
        </div>
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className={s.cardHead}>
          <div className="sec-title" style={{ marginBottom: 0 }}>
            Historial ({filtered.length})
          </div>
          <div className={s.filters}>
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="TODOS">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
            <select value={fCuenta} onChange={(e) => setFCuenta(e.target.value)}>
              <option value="TODAS">Todas las cuentas</option>
              {(cuentas ?? []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombreCuenta}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className={s.empty}>No hay movimientos con estos filtros.</p>
        ) : (
          <table className={s.movTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={`${m.cuentaId}-${m.id}`} onClick={() => startEdit(m)}>
                  <td>{m.fechaTransaccion ?? '—'}</td>
                  <td>{m.descripcion || '—'}</td>
                  <td>{m.categoriaNombre ?? '—'}</td>
                  <td>{m.cuentaNombre}</td>
                  <td>
                    <span className={`${s.badge} ${s[BADGE[m.tipoMovimiento]]}`}>
                      {TIPO_LABEL[m.tipoMovimiento]}
                    </span>
                  </td>
                  <td
                    className={s.amount}
                    style={{ color: esNegativo(m.tipoMovimiento) ? 'var(--down)' : 'var(--up)' }}
                  >
                    {esNegativo(m.tipoMovimiento) ? '−' : '+'}
                    {formatEur(m.importe, true)}
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
            className={`${s.tab} ${editing == null ? s.tabActive : ''}`}
            onClick={cancelEdit}
          >
            Nueva Transacción
          </button>
          <button
            type="button"
            className={`${s.tab} ${editing != null ? s.tabActive : ''}`}
            disabled={editing == null}
            title={
              editing == null
                ? 'Haz clic en un movimiento del historial para actualizarlo'
                : undefined
            }
          >
            Actualizar
          </button>
        </div>

        <form onSubmit={submit}>
          <div className={s.row}>
            <div className={s.field}>
              <label>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoMovimiento)}
              >
                {tipoOptions.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label>Cuenta</label>
              <select
                value={form.cuentaId}
                onChange={(e) => set('cuentaId', e.target.value)}
                disabled={!!editing}
              >
                <option value="">Selecciona</option>
                {(cuentas ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombreCuenta}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label>Categoría</label>
              <input
                type="text"
                list="mov-cats"
                placeholder="Ej: Alimentación"
                value={form.catName}
                onChange={(e) => set('catName', e.target.value)}
              />
              <datalist id="mov-cats">
                {catsDelTipo.map((c) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
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
              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
              />
            </div>
            <div className={s.field}>
              <label>Descripción</label>
              <input
                type="text"
                placeholder="Opcional"
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
              />
            </div>
          </div>
          <p className={s.hint}>
            Si la categoría no existe, se crea automáticamente con el tipo elegido. Haz clic
            en una fila del historial para editarla.
          </p>
          {formErr && <p className={s.error}>{formErr}</p>}
          <div className={s.actions} style={{ marginTop: 4 }}>
            <button className={s.btn} type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Añadir movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
