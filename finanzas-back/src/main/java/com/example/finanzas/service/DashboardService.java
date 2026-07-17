package com.example.finanzas.service;

import com.example.finanzas.model.UserEntity;

import java.math.BigDecimal;

public interface DashboardService {

    BigDecimal getPatrimonioNeto(UserEntity user);
}
