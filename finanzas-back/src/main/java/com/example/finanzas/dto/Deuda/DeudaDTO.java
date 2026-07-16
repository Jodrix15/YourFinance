package com.example.finanzas.dto.Deuda;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DeudaDTO(
        @NotBlank String nombreDeuda,
        @NotNull BigDecimal importe,
        BigDecimal cantidadPagada,
        @NotBlank String acreedor,
        BigDecimal interes,
        LocalDate fechaVencimiento
) {
    public DeudaDTO {
        if (cantidadPagada == null) {
            cantidadPagada = BigDecimal.ZERO;
        }
    }
}