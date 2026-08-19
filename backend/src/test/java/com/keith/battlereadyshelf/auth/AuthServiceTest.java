package com.keith.battlereadyshelf.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.generated.model.*;
import com.keith.battlereadyshelf.security.JwtService;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock private GoogleIdTokenVerificationService googleIdTokenVerificationService;

    @Mock private UserRepository userRepository;

    @Mock private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService =
                new AuthService(
                        googleIdTokenVerificationService,
                        userRepository,
                        jwtService,
                        "superadmin@example.com");
    }

    @Test
    void authenticateWithGoogle_reusesExistingUser() {
        var userId = UUID.randomUUID();
        var existingUser =
                User.builder()
                        .id(userId)
                        .email("allowed@example.com")
                        .displayName("Existing User")
                        .build();
        when(googleIdTokenVerificationService.verify("google-id-token"))
                .thenReturn(new VerifiedGoogleUser("allowed@example.com", "Updated Google Name"));
        when(userRepository.findByEmail("allowed@example.com"))
                .thenReturn(Optional.of(existingUser));
        when(jwtService.generateToken(existingUser)).thenReturn("jwt-token");

        var response = authService.authenticateWithGoogle(new GoogleAuthRequest("google-id-token"));

        verify(userRepository, never()).save(any(User.class));
        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUser())
                .isEqualTo(
                        new UserDto(userId, "allowed@example.com")
                                .displayName("Existing User")
                                .role(UserRole.USER)
                                .themePreference(ThemePreference.AUTO));
    }

    @Test
    void authenticateWithGoogle_createsSuperadminOnFirstLoginForConfiguredEmail() {
        when(googleIdTokenVerificationService.verify("google-id-token"))
                .thenReturn(new VerifiedGoogleUser("superadmin@example.com", "Super Admin"));
        when(userRepository.findByEmail("superadmin@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");

        var response = authService.authenticateWithGoogle(new GoogleAuthRequest("google-id-token"));

        assertThat(response.getUser().getRole()).isEqualTo(UserRole.SUPERADMIN);
    }
}
