package com.keith.battlereadyshelf.auth;

import com.keith.battlereadyshelf.generated.api.AuthApi;
import com.keith.battlereadyshelf.generated.model.AuthResponse;
import com.keith.battlereadyshelf.generated.model.GoogleAuthRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AuthController implements AuthApi {
    private final AuthService authService;

    @Override
    public ResponseEntity<AuthResponse> authenticateWithGoogle(
            GoogleAuthRequest googleAuthRequest) {
        return ResponseEntity.ok(authService.authenticateWithGoogle(googleAuthRequest));
    }
}
