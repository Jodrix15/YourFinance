package com.example.finanzas.controller;

import com.example.finanzas.model.UserEntity;
import com.example.finanzas.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/patrimonio-neto")
    public ResponseEntity<BigDecimal> getPatrimonioNeto(@AuthenticationPrincipal UserEntity user) {
        return ResponseEntity.ok(dashboardService.getPatrimonioNeto(user));
    }
}
