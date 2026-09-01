package com.keith.battlereadyshelf.security;

import com.keith.battlereadyshelf.error.UnauthorizedException;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AuthenticatedUserProvider {
    public CurrentAuthenticatedUser getCurrentUser() {
        return findCurrentUser()
                .orElseThrow(() -> new UnauthorizedException("A valid bearer token is required."));
    }

    /**
     * The signed-in user, or empty when the request is anonymous. Used by the endpoints that are
     * open to everyone but tailor their response when a token happens to be present (e.g. the
     * model definition catalogue, which substitutes a user's own customisations).
     */
    public Optional<CurrentAuthenticatedUser> findCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !(authentication.getPrincipal() instanceof CurrentAuthenticatedUser currentUser)) {
            return Optional.empty();
        }
        return Optional.of(currentUser);
    }
}
