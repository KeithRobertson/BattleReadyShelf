package com.keith.battlereadyshelf.security;

import java.util.UUID;

public record CurrentAuthenticatedUser(UUID id, String email) {}
