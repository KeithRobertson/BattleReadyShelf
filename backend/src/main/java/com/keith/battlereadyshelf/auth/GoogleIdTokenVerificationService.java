package com.keith.battlereadyshelf.auth;

import static java.lang.Boolean.TRUE;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.keith.battlereadyshelf.error.UnauthorizedException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Service
@RequiredArgsConstructor
public class GoogleIdTokenVerificationService {
    private final GoogleIdTokenVerifier googleIdTokenVerifier;

    public VerifiedGoogleUser verify(String idToken) {
        try {
            var verifiedToken = googleIdTokenVerifier.verify(idToken);
            if (verifiedToken == null) {
                throw new UnauthorizedException("Invalid or expired Google ID token.");
            }

            var payload = verifiedToken.getPayload();
            if (!TRUE.equals(payload.getEmailVerified())) {
                throw new UnauthorizedException("Google account email is not verified.");
            }
            return new VerifiedGoogleUser(payload.getEmail(), (String) payload.get("name"));
        } catch (GeneralSecurityException | IOException ex) {
            throw new UnauthorizedException("Invalid or expired Google ID token.", ex);
        }
    }
}
