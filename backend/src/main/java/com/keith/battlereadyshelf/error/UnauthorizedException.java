package com.keith.battlereadyshelf.error;


import static org.springframework.http.HttpStatus.UNAUTHORIZED;

public class UnauthorizedException extends ApiException {
    public UnauthorizedException(String message) {
        super(UNAUTHORIZED, message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(UNAUTHORIZED, message, cause);
    }
}
