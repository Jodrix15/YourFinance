package com.example.finanzas.service;

import com.example.finanzas.dto.categoria.CrearCategoria;
import com.example.finanzas.model.CategoriaEntity;
import com.example.finanzas.model.UserEntity;

import java.util.List;

public interface CategoriaService {

    CategoriaEntity crear(CrearCategoria dto, UserEntity user);

    List<CategoriaEntity> listar(UserEntity user);
}
