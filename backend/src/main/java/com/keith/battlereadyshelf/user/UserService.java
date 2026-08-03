package com.keith.battlereadyshelf.user;

import com.keith.battlereadyshelf.auth.AuthService;
import com.keith.battlereadyshelf.error.UnauthorizedException;
import com.keith.battlereadyshelf.generated.model.UserDto;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public UserDto getUserDtoById(UUID userId) {
        return userRepository
                .findById(userId)
                .map(AuthService::toUserDto)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user does not exist."));
    }
}
