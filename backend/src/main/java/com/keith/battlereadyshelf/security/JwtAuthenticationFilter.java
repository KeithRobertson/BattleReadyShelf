package com.keith.battlereadyshelf.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.error.UnauthorizedException;
import com.keith.battlereadyshelf.generated.model.ApiError;

import com.keith.battlereadyshelf.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.jspecify.annotations.NonNull;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        var authorizationHeader = request.getHeader(AUTHORIZATION_HEADER);
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var currentUser =
                    jwtService.parseToken(authorizationHeader.substring(BEARER_PREFIX.length()));
            var user = userRepository.findById(currentUser.id())
                                     .orElseThrow(() -> new UnauthorizedException("User not found"));
            Instant tokenIssuedAt = currentUser.issuedAt();
            Instant userUpdatedAt = user.getRoleUpdatedAt();
            if (tokenIssuedAt.isBefore(userUpdatedAt)) {
                throw new UnauthorizedException("Token invalid due to role change");
            }
            var authorities =
                    List.of(new SimpleGrantedAuthority("ROLE_" + currentUser.role().name()));
            var authentication =
                    new UsernamePasswordAuthenticationToken(currentUser, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (UnauthorizedException ex) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), new ApiError(ex.getMessage()));
        }
    }
}
