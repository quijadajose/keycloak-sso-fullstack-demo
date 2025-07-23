package com.ejemplo.backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;


@RestController
@RequestMapping("/users")
public class UserController {

    @GetMapping("/me")
    public Object getProfile(JwtAuthenticationToken token) {
        return token.getToken().getClaims();
    }

    @PreAuthorize("hasAuthority('ROLE_realm_admin')")
    @GetMapping("/admin-data")
    public Object getAdminData() {
        return Map.of("msg", "Solo para admin");
    }


}
