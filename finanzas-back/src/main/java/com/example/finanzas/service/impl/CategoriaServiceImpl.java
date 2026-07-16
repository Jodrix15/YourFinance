package com.example.finanzas.service.impl;
import com.example.finanzas.service.CategoriaService;

import com.example.finanzas.dto.categoria.CrearCategoria;
import com.example.finanzas.model.CategoriaEntity;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.repository.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaServiceImpl implements CategoriaService {

    private final CategoriaRepository repository;

    public CategoriaEntity crear(CrearCategoria dto, UserEntity user) {
        CategoriaEntity categoria = new CategoriaEntity();
        categoria.setNombreCategoria(dto.nombre());
        categoria.setTipo(dto.tipo());
        categoria.setUser(user);
        return repository.save(categoria);
    }

    public List<CategoriaEntity> listar(UserEntity user) {
        return repository.findByUserId(user.getId());
    }
}