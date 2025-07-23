package com.ejemplo.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Service
public class AuthService {

    @Value("${keycloak.client-id}")
    private String clientId;

    @Value("${keycloak.client-secret}")
    private String clientSecret;

    @Value("${keycloak.redirect-uri}")
    private String redirectUri;

    @Value("${keycloak.issuer-uri}")
    private String issuerUri;

    private final RestTemplate restTemplate = new RestTemplate();

    public record PkceResult(String redirectUrl, String codeVerifier) {
    }

    public record TokenResult(
            String accessToken,
            String refreshToken,
            String idToken,
            long accessExpiresIn,
            long refreshExpiresIn
    ) {
    }

    public PkceResult generatePkce() {
        String codeVerifier = generateCodeVerifier();
        String codeChallenge = generateCodeChallenge(codeVerifier);
        String state = generateRandomHex(8);

        String redirectUrl = UriComponentsBuilder
                .fromHttpUrl(issuerUri + "/protocol/openid-connect/auth")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid profile email")
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .queryParam("state", state)
                .toUriString();

        return new PkceResult(redirectUrl, codeVerifier);
    }

    public TokenResult handleCallback(String code, String codeVerifier) {
        String tokenUrl = issuerUri + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("code_verifier", codeVerifier);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> resp = restTemplate.postForEntity(tokenUrl, request, Map.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("Token exchange failed: " + resp.getStatusCode());
        }
        Map<String, Object> data = resp.getBody();

        return new TokenResult(
                (String) data.get("access_token"),
                (String) data.get("refresh_token"),
                (String) data.get("id_token"),
                ((Number) data.get("expires_in")).longValue(),
                ((Number) data.get("refresh_expires_in")).longValue()
        );
    }

    public TokenResult refreshToken(String refreshToken) {
        String tokenUrl = issuerUri + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", refreshToken);
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> resp = restTemplate.postForEntity(tokenUrl, request, Map.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("Refresh token failed: " + resp.getStatusCode());
        }
        Map<String, Object> data = resp.getBody();

        return new TokenResult(
                (String) data.get("access_token"),
                (String) data.get("refresh_token"),
                null,
                ((Number) data.get("expires_in")).longValue(),
                data.containsKey("refresh_expires_in")
                        ? ((Number) data.get("refresh_expires_in")).longValue()
                        : 0L
        );
    }

    public void logout(String refreshToken) {
        String logoutUrl = issuerUri + "/protocol/openid-connect/logout";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("refresh_token", refreshToken);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Void> resp = restTemplate.postForEntity(logoutUrl, request, Void.class);

        if (!(resp.getStatusCode() == HttpStatus.NO_CONTENT || resp.getStatusCode() == HttpStatus.OK)) {
            throw new RuntimeException("Keycloak logout failed: " + resp.getStatusCode());
        }
    }

    private String generateCodeVerifier() {
        byte[] code = new byte[32];
        new SecureRandom().nextBytes(code);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(code);
    }

    private String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate code challenge", e);
        }
    }

    private String generateRandomHex(int byteCount) {
        byte[] randomBytes = new byte[byteCount];
        new SecureRandom().nextBytes(randomBytes);
        return HexFormat.of().formatHex(randomBytes);
    }
}
