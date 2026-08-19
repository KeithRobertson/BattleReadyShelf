package com.keith.battlereadyshelf.security;

import com.keith.battlereadyshelf.user.Role;

import java.time.Instant;
import java.util.UUID;

public record CurrentAuthenticatedUser(UUID id, String email, Role role, Instant issuedAt, Instant roleUpdatedAt) {}
