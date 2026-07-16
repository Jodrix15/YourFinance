package com.example.finanzas.service.impl;
import com.example.finanzas.service.CuentaService;

import com.example.finanzas.dto.cuenta.CuentaDTO;
import com.example.finanzas.dto.cuenta.TransaccionDTO;
import com.example.finanzas.model.CategoriaEntity;
import com.example.finanzas.model.CuentaEntity;
import com.example.finanzas.model.TransaccionEntity;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.repository.CategoriaRepository;
import com.example.finanzas.repository.CuentaRepository;
import com.example.finanzas.repository.TransaccionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CuentaServiceImpl implements CuentaService {

    private final CuentaRepository repository;
    private final TransaccionRepository transaccionRepository;
    private final CategoriaRepository categoriaRepository;

    public CuentaEntity getCuenta(Long id, UserEntity user) {
        CuentaEntity cuenta = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cuenta no encontrada con id " + id));
        verificarPropiedad(cuenta, user);
        return cuenta;
    }

    public List<CuentaEntity> getAllCuentas(UserEntity user) {
        return repository.findByUserId(user.getId());
    }

    public CuentaEntity addCuenta(UserEntity user, CuentaDTO cuentaDTO) {
        CuentaEntity cuenta = new CuentaEntity();
        cuenta.setUser(user);
        cuenta.setNombreCuenta(cuentaDTO.nombreCuenta());
        cuenta.setImporte(cuentaDTO.importe());
        return repository.save(cuenta);
    }

    public CuentaEntity updateCuenta(Long id, CuentaDTO cuentaDTO, UserEntity user) {
        CuentaEntity cuenta = getCuenta(id, user);
        cuenta.setNombreCuenta(cuentaDTO.nombreCuenta());
        cuenta.setImporte(cuentaDTO.importe());
        return repository.save(cuenta);
    }

    public List<TransaccionEntity> getAllTransacciones(Long cuentaId, UserEntity user) {
        return getCuenta(cuentaId, user).getTransacciones();
    }

    public TransaccionEntity getTransaccion(Long cuentaId, Long transaccionId, UserEntity user) {
        getCuenta(cuentaId, user);
        TransaccionEntity transaccion = transaccionRepository.findById(transaccionId)
                .orElseThrow(() -> new EntityNotFoundException("Transaccion no encontrada con id " + transaccionId));
        verificarTransaccionDeCuenta(transaccion, cuentaId);
        return transaccion;
    }

    @Transactional
    public TransaccionEntity addTransaccionToCuenta(Long cuentaId, TransaccionDTO transaccionDTO, UserEntity user) {
        CuentaEntity cuenta = getCuenta(cuentaId, user);

        TransaccionEntity transaccion = new TransaccionEntity();
        transaccion.setUser(user);
        transaccion.setCuenta(cuenta);
        aplicarDTO(transaccion, transaccionDTO, user);
        cuenta.aplicarTransaccion(transaccion);
        repository.save(cuenta);
        return transaccionRepository.save(transaccion);
    }

    @Transactional
    public TransaccionEntity updateTransaccion(Long cuentaId, Long transaccionId, TransaccionDTO transaccionDTO, UserEntity user) {
        TransaccionEntity transaccion = getTransaccion(cuentaId, transaccionId, user);
        CuentaEntity cuenta = transaccion.getCuenta();
        aplicarDTO(transaccion, transaccionDTO, user);
        cuenta.aplicarTransaccion(transaccion);

        repository.save(cuenta);
        return transaccionRepository.save(transaccion);
    }

    @Transactional
    public void deleteTransaccion(Long cuentaId, Long transaccionId, UserEntity user) {
        TransaccionEntity transaccion = getTransaccion(cuentaId, transaccionId, user);
        CuentaEntity cuenta = transaccion.getCuenta();
        // Revierte el efecto de la transacción en el saldo antes de borrarla.
        cuenta.setImporte(cuenta.getImporte().subtract(transaccion.getImporteConSigno()));
        repository.save(cuenta);
        transaccionRepository.delete(transaccion);
    }

    private void aplicarDTO(TransaccionEntity transaccion, TransaccionDTO transaccionDTO, UserEntity user) {
        transaccion.setCategoria(resolverCategoria(transaccionDTO.categoriaId(), user));
        transaccion.setTipoMovimiento(transaccionDTO.tipoMovimiento());
        transaccion.setImporte(transaccionDTO.importe());
        transaccion.setDescripcion(transaccionDTO.descripcion());
        transaccion.setFechaTransaccion(transaccionDTO.fecha());
    }

    private CategoriaEntity resolverCategoria(Long categoriaId, UserEntity user) {
        CategoriaEntity categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria no encontrada con id " + categoriaId));
        if (!categoria.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("La categoria no pertenece al usuario");
        }
        return categoria;
    }

    private void verificarPropiedad(CuentaEntity cuenta, UserEntity user) {
        if (!cuenta.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("No tienes acceso a esta cuenta");
        }
    }

    private void verificarTransaccionDeCuenta(TransaccionEntity transaccion, Long cuentaId) {
        if (!transaccion.getCuenta().getId().equals(cuentaId)) {
            throw new EntityNotFoundException("Transaccion no encontrada en esta cuenta");
        }
    }
}