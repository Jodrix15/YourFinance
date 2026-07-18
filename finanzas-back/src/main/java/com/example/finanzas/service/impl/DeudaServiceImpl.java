package com.example.finanzas.service.impl;
import com.example.finanzas.service.DeudaService;

import com.example.finanzas.dto.Deuda.DeudaDTO;
import com.example.finanzas.model.DeudaEntity;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.repository.DeudaRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeudaServiceImpl implements DeudaService {

    private final DeudaRepository repository;

    public DeudaEntity getDeuda(Long id, UserEntity user) {
        DeudaEntity deuda = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Deuda no encontrada con id " + id));
        verificarPropiedad(deuda, user);
        return deuda;
    }

    public List<DeudaEntity> getAllDeudas(UserEntity user) {
        return repository.findByUserId(user.getId());
    }

    public DeudaEntity crear(DeudaDTO deudaDTO, UserEntity user){
        DeudaEntity deuda = new DeudaEntity();
        aplicarDTO(deuda, deudaDTO);
        deuda.setUser(user);
        return repository.save(deuda);
    }

    public BigDecimal getImporteTotal(UserEntity user) {
        BigDecimal importe = BigDecimal.ZERO;
        List<DeudaEntity> deudas = getAllDeudas(user);
        for (DeudaEntity deuda : deudas) {
            importe = importe.add(deuda.getImporteTotal());
        }
        return importe;
    }

    public DeudaEntity update(Long id, DeudaDTO deudaDTO, UserEntity user){
        DeudaEntity deuda = getDeuda(id, user);
        aplicarDTO(deuda, deudaDTO);
        return repository.save(deuda);
    }

    public void remove(Long id, UserEntity user) {
        repository.delete(getDeuda(id, user));
    }

    private void aplicarDTO(DeudaEntity deuda, DeudaDTO deudaDTO) {
        deuda.setNombreDeuda(deudaDTO.nombreDeuda());
        deuda.setImporte(deudaDTO.importe());
        deuda.setCantidadPagada(deudaDTO.cantidadPagada());
        deuda.setAcreedor(deudaDTO.acreedor());
        deuda.setInteres(deudaDTO.interes());
        deuda.setFrecuencia(deudaDTO.frecuencia());
        deuda.setCuota(deudaDTO.cuota());
        deuda.setFechaVencimiento(deudaDTO.fechaVencimiento());
    }

    private void verificarPropiedad(DeudaEntity deuda, UserEntity user) {
        if (!deuda.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("No tienes acceso a esta deuda");
        }
    }
}
