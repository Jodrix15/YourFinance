package com.example.finanzas.controller;

import com.example.finanzas.dto.dashboard.PatrimonioSnapshotResponse;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/patrimonio-neto")
    public ResponseEntity<BigDecimal> getPatrimonioNeto(@AuthenticationPrincipal UserEntity user) {
        return ResponseEntity.ok(dashboardService.getPatrimonioNeto(user));
    }

    /**
     * Histórico mensual de patrimonio. Antes de devolverlo, actualiza (upsert)
     * la foto del mes en curso con los valores actuales, de modo que el último
     * punto de la curva siempre refleje el patrimonio de hoy.
     */
    @GetMapping("/patrimonio/historico")
    public ResponseEntity<List<PatrimonioSnapshotResponse>> getHistorico(@AuthenticationPrincipal UserEntity user) {
        dashboardService.capturarSnapshot(user);
        List<PatrimonioSnapshotResponse> historico = dashboardService.getHistorico(user).stream()
                .map(PatrimonioSnapshotResponse::from)
                .toList();
        return ResponseEntity.ok(historico);
    }
}
