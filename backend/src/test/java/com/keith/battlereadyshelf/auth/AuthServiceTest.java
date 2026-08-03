package com.keith.battlereadyshelf.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.error.ForbiddenException;
import com.keith.battlereadyshelf.generated.model.GoogleAuthRequest;
import com.keith.battlereadyshelf.generated.model.UserDto;
import com.keith.battlereadyshelf.security.JwtService;
import com.keith.battlereadyshelf.user.AllowedEmailRepository;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock private GoogleIdTokenVerificationService googleIdTokenVerificationService;

    @Mock private AllowedEmailRepository allowedEmailRepository;

    @Mock private UserRepository userRepository;

    @Mock private JwtService jwtService;

    @Captor private ArgumentCaptor<User> userCaptor;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService =
                new AuthService(
                        googleIdTokenVerificationService,
                        allowedEmailRepository,
                        userRepository,
                        jwtService);
    }

    @Test
    void authenticateWithGoogle_rejectsEmailsNotOnAllowlist() {
        when(googleIdTokenVerificationService.verify("google-id-token"))
                .thenReturn(new VerifiedGoogleUser("blocked@example.com", "Blocked User"));
        when(allowedEmailRepository.existsById("blocked@example.com")).thenReturn(false);
        var googleAuthRequest = new GoogleAuthRequest("google-id-token");

        assertThatThrownBy(() -> authService.authenticateWithGoogle(googleAuthRequest))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage(
                        "Email 'blocked@example.com' is not allowed to access BattleReadyShelf.");

        verify(userRepository, never()).findByEmail(any());
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void authenticateWithGoogle_createsUserOnFirstLogin() {
        var userId = UUID.randomUUID();
        when(googleIdTokenVerificationService.verify("google-id-token"))
                .thenReturn(new VerifiedGoogleUser("allowed@example.com", "Allowed User"));
        when(allowedEmailRepository.existsById("allowed@example.com")).thenReturn(true);
        when(userRepository.findByEmail("allowed@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class)))
                .thenReturn(
                        User.builder()
                                .id(userId)
                                .email("allowed@example.com")
                                .displayName("Allowed User")
                                .build());
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");

        var response = authService.authenticateWithGoogle(new GoogleAuthRequest("google-id-token"));

        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getEmail()).isEqualTo("allowed@example.com");
        assertThat(userCaptor.getValue().getDisplayName()).isEqualTo("Allowed User");
        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUser())
                .isEqualTo(new UserDto(userId, "allowed@example.com").displayName("Allowed User"));
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
        when(allowedEmailRepository.existsById("allowed@example.com")).thenReturn(true);
        when(userRepository.findByEmail("allowed@example.com"))
                .thenReturn(Optional.of(existingUser));
        when(jwtService.generateToken(existingUser)).thenReturn("jwt-token");

        var response = authService.authenticateWithGoogle(new GoogleAuthRequest("google-id-token"));

        verify(userRepository, never()).save(any(User.class));
        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUser())
                .isEqualTo(new UserDto(userId, "allowed@example.com").displayName("Existing User"));
    }
}
