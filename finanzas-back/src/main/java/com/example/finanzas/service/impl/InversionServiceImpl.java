package com.example.finanzas.service.impl;
import com.example.finanzas.service.InversionService;


import com.example.finanzas.dto.inversion.InversionDTO;
import com.example.finanzas.dto.inversion.ActualizarInversionDTO;
import com.example.finanzas.model.CategoriaEntity;
import com.example.finanzas.model.InversionEntity;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.repository.CategoriaRepository;
import com.example.finanzas.repository.InversionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InversionServiceImpl implements InversionService {

    private final InversionRepository repository;
    private final CategoriaRepository categoriaRepository;

    public InversionEntity getInversionById(Long id, UserEntity user){
        InversionEntity inversion = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inversion no encontrada con id " + id));
        verificarPropiedad(inversion, user);
        return inversion;
    }

    public List<InversionEntity> getAllInversiones(UserEntity user){
        return repository.findByUserId(user.getId());
    }



    public InversionEntity add(InversionDTO inversionDTO, UserEntity user){
        InversionEntity inversion = new InversionEntity();
        inversion.setUser(user);
        inversion.setCategoria(resolverCategoria(inversionDTO.categoriaId(), user));
        inversion.setCapitalAportado(inversionDTO.capitalAportado());
        inversion.setCapitalTotal(inversionDTO.capitalTotal());
        return repository.save(inversion);
    }

    public InversionEntity actualizar(Long id, ActualizarInversionDTO dto, UserEntity user){
        InversionEntity inversion = getInversionById(id, user);

        if (dto.aportacion() == null && dto.valorActual() == null) {
            throw new IllegalArgumentException("Debes indicar una aportación o un valor actual");
        }

        // 1) Nueva aportación: suma al capital aportado y al total.
        if (dto.aportacion() != null && dto.aportacion().signum() > 0) {
            inversion.setCapitalAportado(inversion.getCapitalAportado().add(dto.aportacion()));
            inversion.setCapitalTotal(inversion.getCapitalTotal().add(dto.aportacion()));
        }

        // 2) Valor actual: fija el capital total al valor observado ahora.
        if (dto.valorActual() != null) {
            inversion.setCapitalTotal(dto.valorActual());
        }

        return repository.save(inversion);
    }

    public void remove(Long id, UserEntity user) {
        repository.delete(getInversionById(id, user));
    }

    private CategoriaEntity resolverCategoria(Long categoriaId, UserEntity user) {
        CategoriaEntity categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria no encontrada con id " + categoriaId));
        if (!categoria.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("La categoria no pertenece al usuario");
        }
        return categoria;
    }

    private void verificarPropiedad(InversionEntity inversion, UserEntity user) {
        if (!inversion.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("No tienes acceso a esta inversion");
        }
    }

    public BigDecimal getImporteTotal(UserEntity user) {
        return getAllInversiones(user).stream()
                .map(InversionEntity::getCapitalTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

}