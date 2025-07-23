package com.ejemplo.backend.controller;

import com.ejemplo.backend.service.AuthService;
import com.ejemplo.backend.service.AuthService.PkceResult;
import com.ejemplo.backend.service.AuthService.TokenResult;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    @Value("${spa.base-url}")
    private String spaBaseUrl;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/login")
    public ResponseEntity<Void> login(HttpServletResponse response) {
        PkceResult pkce = authService.generatePkce();

        ResponseCookie cookie = ResponseCookie.from("pkce_verifier", pkce.codeVerifier())
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(300)
                .sameSite("None")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, pkce.redirectUrl())
                .build();
    }

    @GetMapping("/callback")
    public void callback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        String codeVerifier = null;
        for (Cookie c : request.getCookies()) {
            if ("pkce_verifier".equals(c.getName())) {
                codeVerifier = c.getValue();
            }
        }
        if (codeVerifier == null) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "PKCE verifier missing");
            return;
        }

        TokenResult tokens = authService.handleCallback(code, codeVerifier);

        ResponseCookie clearPkce = ResponseCookie.from("pkce_verifier", "")
                .httpOnly(true).secure(true).path("/")
                .maxAge(0).sameSite("None").build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearPkce.toString());

        ResponseCookie refresh = ResponseCookie.from("refresh_token", tokens.refreshToken())
                .httpOnly(true).secure(true).path("/")
                .maxAge(tokens.refreshExpiresIn()).sameSite("None").build();
        response.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());

        response.sendRedirect(spaBaseUrl + "/auth-callback");
    }

    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.OK)
    public ResponseEntity<Object> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = null;
        for (Cookie c : request.getCookies()) {
            if ("refresh_token".equals(c.getName())) {
                refreshToken = c.getValue();
            }
        }
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        TokenResult tokens = authService.refreshToken(refreshToken);

        ResponseCookie refresh = ResponseCookie.from("refresh_token", tokens.refreshToken())
                .httpOnly(true).secure(true).path("/")
                .maxAge(tokens.refreshExpiresIn())
                .sameSite("None").build();
        response.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());

        return ResponseEntity.ok(Map.of(
                "access_token", tokens.accessToken(),
                "expires_in", tokens.accessExpiresIn(),
                "token_type", "Bearer"
        ));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = null;
        for (Cookie c : request.getCookies()) {
            if ("refresh_token".equals(c.getName())) {
                refreshToken = c.getValue();
            }
        }
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        ResponseCookie clear = ResponseCookie.from("refresh_token", "")
                .httpOnly(true).secure(true).path("/")
                .maxAge(0).sameSite("None").build();
        response.addHeader(HttpHeaders.SET_COOKIE, clear.toString());
    }
}
