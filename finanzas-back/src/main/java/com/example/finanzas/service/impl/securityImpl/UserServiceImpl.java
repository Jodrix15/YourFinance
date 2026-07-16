package com.example.finanzas.service.impl.securityImpl;
import com.example.finanzas.service.security.UserService;
import com.example.finanzas.service.security.JwtService;

import com.example.finanzas.dto.auth.LoginResponse;
import com.example.finanzas.dto.auth.RegisterRequest;
import com.example.finanzas.model.enums.RoleEnum;
import com.example.finanzas.model.UserEntity;
import com.example.finanzas.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));
    }

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("El nombre de usuario ya existe");
        }
        UserEntity user = UserEntity.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(RoleEnum.ROLE_USER)
                .build();
        userRepository.save(user);
        return LoginResponse.builder()
                .token(jwtService.generateToken(user))
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }
}