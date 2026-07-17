// Tipos espejo de los DTOs del backend Spring (com.example.finanzas.dto.*)

export type TipoMovimiento = 'GASTO' | 'INGRESO' | 'INVERSION'
export type Frecuencia = 'MENSUAL' | 'ANUAL'
export type TipoPago = 'RECURRENTE' | 'SUSCRIPCION'
export type Role = 'ROLE_ADMIN' | 'ROLE_USER'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
  role: Role
}

export interface CuentaResponse {
  id: number
  nombreCuenta: string
  importe: number
}

export interface CuentaDTO {
  nombreCuenta: string
  importe: number
}

export interface TransaccionResponse {
  id: number
  cuentaId: number | null
  tipoMovimiento: TipoMovimiento
  categoriaId: number | null
  categoriaNombre: string | null
  importe: number
  descripcion: string
  fechaTransaccion: string // ISO date (yyyy-MM-dd)
}

export interface TransaccionDTO {
  tipoMovimiento: TipoMovimiento
  categoriaId: number
  importe: number
  descripcion?: string
  fecha: string
}

export interface Movimiento extends TransaccionResponse {
  cuentaNombre: string
}

export interface InversionResponse {
  id: number
  categoriaId: number | null
  categoriaNombre: string | null
  capitalAportado: number
  capitalTotal: number
  plusvalia: number
  porcentajePlusvalia: number
}

export interface DeudaResponse {
  id: number
  nombreDeuda: string
  importe: number
  cantidadPendiente: number
  importeTotal: number
  cantidadPagada: number
  acreedor: string
  interes: number
  fechaVencimiento: string | null
}

export interface DeudaDTO {
  nombreDeuda: string
  importe: number
  cantidadPagada?: number
  acreedor: string
  interes?: number
  fechaVencimiento?: string | null
}

export interface RecurrentePrecioResponse {
  id: number
  fechaVariacionImporte: string
  importe: number
}

export interface GastoRecurrenteResponse {
  id: number
  nombre: string
  categoriaId: number | null
  categoriaNombre: string | null
  tipoPago: TipoPago
  frecuencia: Frecuencia
  fechaPrimerPago: string | null
  fechaUltimoPago: string | null
  fechaProximoPago: string | null
  active: boolean
  importeActual: number | null
  historial: RecurrentePrecioResponse[]
}

export interface CrearGasto {
  nombre: string
  categoriaId: number
  tipoPago: TipoPago
  frecuencia: Frecuencia
  fechaPrimerPago: string
  fechaUltimoPago: string
  active: boolean
  importeInicial: number
}

export interface ActualizarGasto {
  nombre: string
  categoriaId: number
  tipoPago: TipoPago
  frecuencia: Frecuencia
  fechaPrimerPago: string
  fechaUltimoPago: string
  active: boolean
}

export interface NuevoPrecioRequest {
  importe: number
  fechaVariacionImporte: string
}

export interface CategoriaResponse {
  id: number
  nombre: string
  tipo: TipoMovimiento
}

// ── Cuerpos de petición ──
export interface InversionDTO {
  categoriaId: number
  capitalAportado: number
  capitalTotal: number
}

export interface ActualizarInversionDTO {
  aportacion?: number
  valorActual?: number
}

export interface CrearCategoria {
  nombre: string
  tipo: TipoMovimiento
}

// Foto mensual del patrimonio (mes = primer día del mes, 'YYYY-MM-DD')
export interface PatrimonioSnapshot {
  mes: string
  patrimonioNeto: number
  cuentas: number
  inversiones: number
  deudas: number
}
