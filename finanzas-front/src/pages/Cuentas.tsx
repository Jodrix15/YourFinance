import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrearCuenta, useCuentas, useMovimientos } from '@/hooks/useFinance'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import s from './Cuentas.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const NOW = new Date()
const CUR_MES = String(NOW.getMonth() + 1).padStart(2, '0')
const CUR_ANIO = String(NOW.getFullYear())

export default function Cuentas() {
  const navigate = useNavigate()
  const { data: cuentas, isLoading, isError, error } = useCuentas()
  const { data: movs } = useMovimientos()
  const crearCuenta = useCrearCuenta()

  const [fMes, setFMes] = useState(CUR_MES)
  const [fAnio, setFAnio] = useState(CUR_ANIO)
  const [nombre, setNombre] = useState('')
  const [importe, setImporte] = useState('')
  const [formErr, setFormErr] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  function irAlFormulario() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(
      () => formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }),
      350,
    )
  }

  if (isLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={130} height={26} />
          <Skeleton width={360} height={14} style={{ marginTop: 8 }} />
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
          <Skeleton width={110} height={13} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={220} height={120} radius="var(--r-lg)" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const list = cuentas ?? []
  const total = sum(list.map((c) => c.importe))
  const allMovs = movs ?? []
  const anios = [...new Set([...allMovs.map((m) => (m.fechaTransaccion ?? '').slice(0, 4)).filter(Boolean), CUR_ANIO])].sort().reverse()
  const periodo = allMovs.filter((m) => {
    const f = m.fechaTransaccion ?? ''
    return (fAnio === '' || f.slice(0, 4) === fAnio) && (fMes === '' || f.slice(5, 7) === fMes)
  })
  const ingresos = sum(periodo.filter((m) => m.tipoMovimiento === 'INGRESO').map((m) => m.importe))
  const gastos = sum(periodo.filter((m) => m.tipoMovimiento === 'GASTO').map((m) => Math.abs(m.importe)))
  const diferencia = ingresos - gastos

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const nom = nombre.trim()
    const imp = num(importe)
    if (!nom) return setFormErr('Indica el nombre de la cuenta.')
    if (Number.isNaN(imp)) return setFormErr('Indica el saldo inicial (puede ser 0).')
    try {
      await crearCuenta.mutateAsync({ nombreCuenta: nom, importe: imp })
      notifyOk('Cuenta creada')
      setNombre('')
      setImporte('')
    } catch (err) {
      setFormErr(apiErrorMessage(err))
      notifyError(err)
    }
  }

  return (
    <div>
      <div className={s.header}>
        <h1>Cuentas</h1>
        <p>Tus cuentas y su saldo. Haz clic en una para ver sus movimientos.</p>
      </div>

      <div className={s.filters}>
        <select value={fMes} onChange={(e) => setFMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {MESES.map((mes, idx) => (<option key={mes} value={String(idx + 1).padStart(2, '0')}>{mes}</option>))}
        </select>
        <select value={fAnio} onChange={(e) => setFAnio(e.target.value)}>
          <option value="">Todos los años</option>
          {anios.map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}><div className={s.kpiLabel}>Total en cuentas</div><div className={s.kpiValue}>{formatEur(total)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Ingresos</div><div className={s.kpiValue} style={{ color: 'var(--up)' }}>{formatEur(ingresos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Gastos</div><div className={s.kpiValue} style={{ color: 'var(--down)' }}>{formatEur(gastos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Diferencia</div><div className={s.kpiValue} style={{ color: diferencia >= 0 ? 'var(--up)' : 'var(--down)' }}>{formatEur(diferencia)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Nº de cuentas</div><div className={s.kpiValue}>{list.length}</div></div>
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className="sec-title">Mis cuentas</div>
        {list.length === 0 ? (
          <EmptyState
            message="Aún no tienes cuentas. Empieza creando la primera para ver aquí tu saldo."
            actionLabel="Añadir tu primera cuenta"
            onAction={irAlFormulario}
          />
        ) : (
          <div className={s.grid}>
            {list.map((c) => (
              <div key={c.id} className={s.cuentaCard} onClick={() => navigate(`/cuentas/${c.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/cuentas/${c.id}`)}>
                <div className={s.cuentaTop}>
                  <div className={s.cuentaIcon}><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5zm10.5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2M2 5h12V4H2z" /></svg></div>
                  <div className={s.cuentaName}>{c.nombreCuenta}</div>
                </div>
                <div className={s.cuentaSaldo}>{formatEur(c.importe)}</div>
                <div className={s.cuentaLink}>Ver movimientos →</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form ref={formRef} className={`card ${s.cardBlock}`} onSubmit={submit}>
        <div className="sec-title">Añadir cuenta</div>
        <div className={s.row}>
          <div className={s.field}><label>Nombre</label><input type="text" placeholder="Ej: Cuenta corriente" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className={s.field}><label>Saldo inicial (€)</label><input type="number" step="0.01" placeholder="0,00" value={importe} onChange={(e) => setImporte(e.target.value)} /></div>
        </div>
        {formErr && <p className={s.error}>{formErr}</p>}
        <button className={s.btn} type="submit" disabled={crearCuenta.isPending} style={{ marginTop: 4 }}>{crearCuenta.isPending ? 'Guardando…' : 'Añadir cuenta'}</button>
      </form>
    </div>
  )
}
