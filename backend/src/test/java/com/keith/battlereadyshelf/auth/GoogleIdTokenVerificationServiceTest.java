package com.keith.battlereadyshelf.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.keith.battlereadyshelf.error.UnauthorizedException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.GeneralSecurityException;

@ExtendWith(MockitoExtension.class)
class GoogleIdTokenVerificationServiceTest {
    @Mock private GoogleIdTokenVerifier googleIdTokenVerifier;

    @Mock private GoogleIdToken googleIdToken;

    @Mock private GoogleIdToken.Payload payload;

    private GoogleIdTokenVerificationService googleIdTokenVerificationService;

    @BeforeEach
    void setUp() {
        googleIdTokenVerificationService =
                new GoogleIdTokenVerificationService(googleIdTokenVerifier);
    }

    @Test
    void verify_returnsVerifiedGoogleUserWhenTokenIsValid() throws Exception {
        when(googleIdTokenVerifier.verify("valid-id-token")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(payload.getEmailVerified()).thenReturn(true);
        when(payload.getEmail()).thenReturn("allowed@example.com");
        when(payload.get("name")).thenReturn("Allowed User");

        var verifiedGoogleUser = googleIdTokenVerificationService.verify("valid-id-token");

        assertThat(verifiedGoogleUser.email()).isEqualTo("allowed@example.com");
        assertThat(verifiedGoogleUser.displayName()).isEqualTo("Allowed User");
    }

    @Test
    void verify_throwsUnauthorizedExceptionWhenEmailIsNotVerified() throws Exception {
        when(googleIdTokenVerifier.verify("unverified-id-token")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(payload.getEmailVerified()).thenReturn(false);

        assertThatThrownBy(() -> googleIdTokenVerificationService.verify("unverified-id-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Google account email is not verified.");
    }

    @Test
    void verify_throwsUnauthorizedExceptionWhenTokenIsInvalid() throws Exception {
        when(googleIdTokenVerifier.verify("invalid-id-token")).thenReturn(null);

        assertThatThrownBy(() -> googleIdTokenVerificationService.verify("invalid-id-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid or expired Google ID token.");
    }

    @Test
    void verify_throwsUnauthorizedExceptionWhenVerifierFails() throws Exception {
        when(googleIdTokenVerifier.verify("invalid-id-token"))
                .thenThrow(new GeneralSecurityException("bad signature"));

        assertThatThrownBy(() -> googleIdTokenVerificationService.verify("invalid-id-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid or expired Google ID token.");
    }
}
