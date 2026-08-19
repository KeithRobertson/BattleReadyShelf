package com.keith.battlereadyshelf.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.keith.battlereadyshelf.error.UnauthorizedException;
import com.keith.battlereadyshelf.user.Role;
import com.keith.battlereadyshelf.user.User;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

class JwtServiceTest {
    private static final String SECRET = "01234567890123456789012345678901";
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, 60_000L);
    }

    @Test
    void generateTokenAndParseToken_roundTripUserClaims() {
        var user =
                User.builder()
                        .id(UUID.randomUUID())
                        .email("allowed@example.com")
                        .displayName("Allowed User")
                        .role(Role.ADMIN)
                        .roleUpdatedAt(Instant.parse("2026-08-18T18:45:00Z"))
                        .build();

        var token = jwtService.generateToken(user);
        var authenticatedUser = jwtService.parseToken(token);

        assertThat(authenticatedUser.id()).isEqualTo(user.getId());
        assertThat(authenticatedUser.email()).isEqualTo(user.getEmail());
        assertThat(authenticatedUser.role()).isEqualTo(user.getRole());
    }

    @Test
    void parseToken_throwsUnauthorizedExceptionWhenTokenIsInvalid() {
        assertThatThrownBy(() -> jwtService.parseToken("not-a-valid-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid or expired bearer token.");
    }
}
