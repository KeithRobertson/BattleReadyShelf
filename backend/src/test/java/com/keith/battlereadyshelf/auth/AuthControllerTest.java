package com.keith.battlereadyshelf.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.generated.model.AuthResponse;
import com.keith.battlereadyshelf.generated.model.GoogleAuthRequest;
import com.keith.battlereadyshelf.generated.model.UserDto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;

import java.util.UUID;

class AuthControllerTest {

    @Mock private AuthService authService;

    private AuthController authController;

    @BeforeEach
    void setUp() {
        authController = new AuthController(authService);
    }

    @Test
    void authenticateWithGoogle_returnsOkResponseFromService() {
        var request = new GoogleAuthRequest("google-id-token");
        var response =
                new AuthResponse(
                        "jwt-token",
                        new UserDto(UUID.randomUUID(), "allowed@example.com")
                                .displayName("Allowed User"));
        when(authService.authenticateWithGoogle(request)).thenReturn(response);

        var result = authController.authenticateWithGoogle(request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isEqualTo(response);
    }
}
