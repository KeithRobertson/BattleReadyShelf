package com.keith.battlereadyshelf.error;

import static org.springframework.http.HttpStatus.CONFLICT;

/** Thrown when a request cannot be completed because it conflicts with the current state of the
 * resource (e.g. deleting a model definition that is still referenced by user data). */
public class ConflictException extends ApiException {
    public ConflictException(String message) {
        super(CONFLICT, message);
    }
}
