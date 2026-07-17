import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/finance'
import type {
  ActualizarGasto,
  ActualizarInversionDTO,
  CrearCategoria,
  CrearGasto,
  CuentaDTO,
  DeudaDTO,
  InversionDTO,
  NuevoPrecioRequest,
  TransaccionDTO,
} from '@/types/api'

export function useCuentas() {
  return useQuery({ queryKey: ['cuentas'], queryFn: financeApi.cuentas })
}

export function useInversiones() {
  return useQuery({ queryKey: ['inversiones'], queryFn: financeApi.inversiones })
}

export function useDeudas() {
  return useQuery({ queryKey: ['deudas'], queryFn: financeApi.deudas })
}

export function useRecurrentes() {
  return useQuery({ queryKey: ['recurrentes'], queryFn: financeApi.recurrentes })
}

export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: financeApi.categorias })
}

export function useMovimientos() {
  return useQuery({ queryKey: ['movimientos'], queryFn: financeApi.movimientos })
}

export function useTransacciones(cuentaId: number) {
  return useQuery({
    queryKey: ['transacciones', cuentaId],
    queryFn: () => financeApi.transacciones(cuentaId),
    enabled: !!cuentaId,
  })
}

export function useCrearCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CuentaDTO) => financeApi.crearCuenta(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas'] }),
  })
}

// ── Mutaciones ──
export function useCrearTransaccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cuentaId, ...body }: { cuentaId: number } & TransaccionDTO) =>
      financeApi.crearTransaccion(cuentaId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['transacciones'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })
}

export function useEliminarTransaccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cuentaId, id }: { cuentaId: number; id: number }) =>
      financeApi.eliminarTransaccion(cuentaId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['transacciones'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })
}

export function useActualizarTransaccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cuentaId, id, ...body }: { cuentaId: number; id: number } & TransaccionDTO) =>
      financeApi.actualizarTransaccion(cuentaId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['transacciones'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })
}
export function useCrearInversion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InversionDTO) => financeApi.crearInversion(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inversiones'] }),
  })
}

export function useActualizarInversion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & ActualizarInversionDTO) =>
      financeApi.actualizarInversion(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inversiones'] }),
  })
}

export function useEliminarInversion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.eliminarInversion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inversiones'] }),
  })
}

export function useCrearCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CrearCategoria) => financeApi.crearCategoria(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export function useCrearDeuda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DeudaDTO) => financeApi.crearDeuda(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deudas'] }),
  })
}

export function useActualizarDeuda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & DeudaDTO) =>
      financeApi.actualizarDeuda(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deudas'] }),
  })
}

export function useEliminarDeuda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.eliminarDeuda(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deudas'] }),
  })
}

export function useCrearRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CrearGasto) => financeApi.crearRecurrente(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}

export function useActualizarRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & ActualizarGasto) =>
      financeApi.actualizarRecurrente(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}

export function useNuevoPrecioRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & NuevoPrecioRequest) =>
      financeApi.nuevoPrecioRecurrente(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}

export function useEliminarRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.removeRecurrente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}
