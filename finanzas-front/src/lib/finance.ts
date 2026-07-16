import { api } from './api'
import type {
  ActualizarGasto,
  ActualizarInversionDTO,
  CategoriaResponse,
  CrearCategoria,
  CrearGasto,
  CuentaDTO,
  CuentaResponse,
  DeudaDTO,
  DeudaResponse,
  GastoRecurrenteResponse,
  InversionDTO,
  InversionResponse,
  LoginRequest,
  LoginResponse,
  Movimiento,
  NuevoPrecioRequest,
  RecurrentePrecioResponse,
  RegisterRequest,
  TransaccionDTO,
  TransaccionResponse,
} from '@/types/api'

// ── Auth ──
export const authApi = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>('/api/auth/login', body).then((r) => r.data),
  register: (body: RegisterRequest) =>
    api.post<LoginResponse>('/api/auth/register', body).then((r) => r.data),
}

// ── Recursos ──
export const financeApi = {
  cuentas: () => api.get<CuentaResponse[]>('/api/cuenta').then((r) => r.data),
  crearCuenta: (body: CuentaDTO) =>
    api.post<CuentaResponse>('/api/cuenta', body).then((r) => r.data),
  actualizarCuenta: (id: number, body: CuentaDTO) =>
    api.put<CuentaResponse>(`/api/cuenta/${id}`, body).then((r) => r.data),
  transacciones: (cuentaId: number) =>
    api
      .get<TransaccionResponse[]>(`/api/cuenta/${cuentaId}/transacciones`)
      .then((r) => r.data),
  // Todos los movimientos: junta las transacciones de todas las cuentas.
  movimientos: async (): Promise<Movimiento[]> => {
    const cuentas = await api.get<CuentaResponse[]>('/api/cuenta').then((r) => r.data)
    const listas = await Promise.all(
      cuentas.map((c) =>
        api
          .get<TransaccionResponse[]>(`/api/cuenta/${c.id}/transacciones`)
          .then((r) => r.data.map((tx) => ({ ...tx, cuentaNombre: c.nombreCuenta }))),
      ),
    )
    return listas.flat()
  },
  crearTransaccion: (cuentaId: number, body: TransaccionDTO) =>
    api
      .post<TransaccionResponse>(`/api/cuenta/${cuentaId}/transacciones`, body)
      .then((r) => r.data),
  actualizarTransaccion: (cuentaId: number, id: number, body: TransaccionDTO) =>
    api
      .put<TransaccionResponse>(`/api/cuenta/${cuentaId}/transacciones/${id}`, body)
      .then((r) => r.data),
  eliminarTransaccion: (cuentaId: number, id: number) =>
    api.delete<void>(`/api/cuenta/${cuentaId}/transacciones/${id}`).then((r) => r.data),
  inversiones: () => api.get<InversionResponse[]>('/api/inversion').then((r) => r.data),
  crearInversion: (body: InversionDTO) =>
    api.post<InversionResponse>('/api/inversion', body).then((r) => r.data),
  actualizarInversion: (id: number, body: ActualizarInversionDTO) =>
    api.put<InversionResponse>(`/api/inversion/${id}`, body).then((r) => r.data),
  deudas: () => api.get<DeudaResponse[]>('/api/deuda').then((r) => r.data),
  crearDeuda: (body: DeudaDTO) =>
    api.post<DeudaResponse>('/api/deuda', body).then((r) => r.data),
  actualizarDeuda: (id: number, body: DeudaDTO) =>
    api.put<DeudaResponse>(`/api/deuda/${id}`, body).then((r) => r.data),
  recurrentes: () =>
    api.get<GastoRecurrenteResponse[]>('/api/recurrente').then((r) => r.data),
  crearRecurrente: (body: CrearGasto) =>
    api.post<GastoRecurrenteResponse>('/api/recurrente', body).then((r) => r.data),
  actualizarRecurrente: (id: number, body: ActualizarGasto) =>
    api.put<GastoRecurrenteResponse>(`/api/recurrente/${id}`, body).then((r) => r.data),
  nuevoPrecioRecurrente: (id: number, body: NuevoPrecioRequest) =>
    api
      .patch<RecurrentePrecioResponse>(`/api/recurrente/${id}/precio`, body)
      .then((r) => r.data),
  registrarPagoRecurrente: (id: number) =>
    api.post<GastoRecurrenteResponse>(`/api/recurrente/${id}/pago`).then((r) => r.data),
  removeRecurrente: (id: number) =>
    api.delete<void>(`/api/recurrente/${id}`).then((r) => r.data),
  categorias: () => api.get<CategoriaResponse[]>('/api/categoria').then((r) => r.data),
  crearCategoria: (body: CrearCategoria) =>
    api.post<CategoriaResponse>('/api/categoria', body).then((r) => r.data),
}
