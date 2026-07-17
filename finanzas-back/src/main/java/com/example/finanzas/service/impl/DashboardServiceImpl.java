package com.example.finanzas.service.impl;

import com.example.finanzas.model.UserEntity;
import com.example.finanzas.service.CuentaService;
import com.example.finanzas.service.DashboardService;
import com.example.finanzas.service.DeudaService;
import com.example.finanzas.service.InversionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final CuentaService cuentaService;
    private final InversionService inversionService;
    private final DeudaService deudaService;

    @Override
    public BigDecimal getPatrimonioNeto(UserEntity user) {
        return cuentaService.getImporteTotal(user)
                .add(inversionService.getImporteTotal(user))
                .subtract(deudaService.getImporteTotal(user));
    }
}
