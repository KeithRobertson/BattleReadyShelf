package com.keith.battlereadyshelf.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.generated.model.ApiError;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.jspecify.annotations.NonNull;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {
    // Spring Boot 4 only auto-configures a Jackson 3 (tools.jackson) ObjectMapper bean by
    // default; we need classic Jackson 2 here to serialize the openapi-generated ApiError DTO,
    // so a plain instance is created directly rather than injected.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(
            @NonNull HttpServletRequest request,
            HttpServletResponse response,
            @NonNull AuthenticationException authException)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getWriter(), new ApiError("A valid bearer token is required."));
    }
}
