package com.example.finanzas.service.security;

import com.example.finanzas.dto.auth.LoginResponse;
import com.example.finanzas.dto.auth.RegisterRequest;
import org.springframework.security.core.userdetails.UserDetailsService;

public interface UserService extends UserDetailsService {

    LoginResponse register(RegisterRequest request);
}
