package com.keith.battlereadyshelf.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.generated.model.ApiError;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.jspecify.annotations.NonNull;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {
    // Spring Boot 4 only auto-configures a Jackson 3 (tools.jackson) ObjectMapper bean by
    // default; we need classic Jackson 2 here to serialize the openapi-generated ApiError DTO,
    // so a plain instance is created directly rather than injected.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(
            @NonNull HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getWriter(),
                new ApiError("You do not have permission to perform this action."));
    }
}
