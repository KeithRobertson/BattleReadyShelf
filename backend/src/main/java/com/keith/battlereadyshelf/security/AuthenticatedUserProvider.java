package com.keith.battlereadyshelf.security;

import com.keith.battlereadyshelf.error.UnauthorizedException;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AuthenticatedUserProvider {
    public CurrentAuthenticatedUser getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !(authentication.getPrincipal()
                        instanceof CurrentAuthenticatedUser currentUser)) {
            throw new UnauthorizedException("A valid bearer token is required.");
        }
        return currentUser;
    }
}
