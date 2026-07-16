package com.example.finanzas.service.impl;
import com.example.finanzas.service.GastoRecurrenteService;

import com.example.finanzas.dto.gasto.ActualizarGasto;
import com.example.finanzas.dto.gasto.CrearGasto;
import com.example.finanzas.dto.gasto.NuevoPrecioRequest;
import com.example.finanzas.model.CategoriaEntity;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.model.Gastos.GastoRecurrenteEntity;
import com.example.finanzas.model.Gastos.RecurrentePrecioEntity;
import com.example.finanzas.repository.CategoriaRepository;
import com.example.finanzas.repository.GastoRecurrenteRepository;
import com.example.finanzas.repository.RecurrentePrecioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GastoRecurrenteServiceImpl implements GastoRecurrenteService {

    private final GastoRecurrenteRepository repository;
    private final RecurrentePrecioRepository precioRepository;
    private final CategoriaRepository categoriaRepository;

    public GastoRecurrenteEntity getGastoRecurrente(Long id, UserEntity user) {
        GastoRecurrenteEntity gastoRecurrente = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("GastoRecurrente no encontrado con id " + id));
        verificarPropiedad(gastoRecurrente, user);
        return gastoRecurrente;
    }

    public List<GastoRecurrenteEntity> getAllGastosRecurrentes(UserEntity user) {
        return repository.findByUserId(user.getId());
    }

    public RecurrentePrecioEntity getImporteActual(Long id, UserEntity user) {
        getGastoRecurrente(id, user); // valida existencia y propiedad
        return precioRepository.findFirstByGastoRecurrenteIdOrderByIdDesc(id)
                .orElseThrow(() -> new EntityNotFoundException("Importe no encontrado con id " + id));
    }

    @Transactional
    public GastoRecurrenteEntity add(CrearGasto gastoRecurrenteDTO, UserEntity user) {
        GastoRecurrenteEntity gastoRecurrente = new GastoRecurrenteEntity();
        gastoRecurrente.setUser(user);
        gastoRecurrente.setCategoria(resolverCategoria(gastoRecurrenteDTO.categoriaId(), user));
        gastoRecurrente.setNombre(gastoRecurrenteDTO.nombre());
        gastoRecurrente.setFrecuencia(gastoRecurrenteDTO.frecuencia());
        gastoRecurrente.setTipoPago(gastoRecurrenteDTO.tipoPago());
        gastoRecurrente.setActive(gastoRecurrenteDTO.active());
        gastoRecurrente.setFechaPrimerPago(gastoRecurrenteDTO.fechaPrimerPago());
        gastoRecurrente.setFechaUltimoPago(gastoRecurrenteDTO.fechaUltimoPago());

        GastoRecurrenteEntity guardado = repository.save(gastoRecurrente);

        RecurrentePrecioEntity recurrentePrecio = new RecurrentePrecioEntity();
        recurrentePrecio.setGastoRecurrente(guardado);
        recurrentePrecio.setFechaVariacionImporte(LocalDate.now());
        recurrentePrecio.setImporte(gastoRecurrenteDTO.importeInicial());
        precioRepository.save(recurrentePrecio);

        return guardado;
    }

    public GastoRecurrenteEntity update(Long id, ActualizarGasto datosActualizados, UserEntity user) {
        GastoRecurrenteEntity existente = getGastoRecurrente(id, user);
        existente.setNombre(datosActualizados.nombre());
        existente.setCategoria(resolverCategoria(datosActualizados.categoriaId(), user));
        existente.setTipoPago(datosActualizados.tipoPago());
        existente.setFrecuencia(datosActualizados.frecuencia());
        existente.setActive(datosActualizados.active());
        existente.setFechaPrimerPago(datosActualizados.fechaPrimerPago());
        existente.setFechaUltimoPago(datosActualizados.fechaUltimoPago());
        return repository.save(existente);
    }

    public RecurrentePrecioEntity registrarNuevoPrecio(Long id, NuevoPrecioRequest nuevoImporte, UserEntity user) {
        GastoRecurrenteEntity gastoRecurrente = getGastoRecurrente(id, user);
        RecurrentePrecioEntity nuevoPrecio = new RecurrentePrecioEntity();
        nuevoPrecio.setGastoRecurrente(gastoRecurrente);
        nuevoPrecio.setFechaVariacionImporte(nuevoImporte.getFechaVariacionImporte());
        nuevoPrecio.setImporte(nuevoImporte.getImporte());
        return precioRepository.save(nuevoPrecio);
    }

    public GastoRecurrenteEntity registrarPago(Long id, UserEntity user) {
        GastoRecurrenteEntity gastoRecurrente = getGastoRecurrente(id, user);
        LocalDate pagado = gastoRecurrente.getFechaProximoPago();
        if (pagado == null) {
            throw new IllegalStateException("No se puede registrar el pago: falta fecha de primer pago o frecuencia");
        }
        // El pago que estaba pendiente pasa a ser el último; el próximo avanza solo.
        gastoRecurrente.setFechaUltimoPago(pagado);
        return repository.save(gastoRecurrente);
    }

    public void remove(Long id, UserEntity user) {
        repository.delete(getGastoRecurrente(id, user));
    }

    private CategoriaEntity resolverCategoria(Long categoriaId, UserEntity user) {
        CategoriaEntity categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria no encontrada con id " + categoriaId));
        if (!categoria.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("La categoria no pertenece al usuario");
        }
        return categoria;
    }

    private void verificarPropiedad(GastoRecurrenteEntity gastoRecurrente, UserEntity user) {
        if (!gastoRecurrente.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("No tienes acceso a este gasto recurrente");
        }
    }
}
