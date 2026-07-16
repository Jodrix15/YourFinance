package com.example.finanzas.repository;

import com.example.finanzas.model.TransaccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransaccionRepository extends JpaRepository<TransaccionEntity, Long> {
    List<TransaccionEntity> findByUserId(UUID userId);
}