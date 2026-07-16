package com.example.finanzas.service;

import com.example.finanzas.dto.cuenta.CuentaDTO;
import com.example.finanzas.dto.cuenta.TransaccionDTO;
import com.example.finanzas.model.CuentaEntity;
import com.example.finanzas.model.TransaccionEntity;
import com.example.finanzas.model.UserEntity;

import java.util.List;

public interface CuentaService {

    CuentaEntity getCuenta(Long id, UserEntity user);

    List<CuentaEntity> getAllCuentas(UserEntity user);

    CuentaEntity addCuenta(UserEntity user, CuentaDTO cuentaDTO);

    CuentaEntity updateCuenta(Long id, CuentaDTO cuentaDTO, UserEntity user);

    List<TransaccionEntity> getAllTransacciones(Long cuentaId, UserEntity user);

    TransaccionEntity getTransaccion(Long cuentaId, Long transaccionId, UserEntity user);

    TransaccionEntity addTransaccionToCuenta(Long cuentaId, TransaccionDTO transaccionDTO, UserEntity user);

    TransaccionEntity updateTransaccion(Long cuentaId, Long transaccionId, TransaccionDTO transaccionDTO, UserEntity user);

    void deleteTransaccion(Long cuentaId, Long transaccionId, UserEntity user);
}
