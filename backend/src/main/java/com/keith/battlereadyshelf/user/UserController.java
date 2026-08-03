package com.keith.battlereadyshelf.user;

import com.keith.battlereadyshelf.generated.api.UsersApi;
import com.keith.battlereadyshelf.generated.model.UserDto;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserController implements UsersApi {
    private final AuthenticatedUserProvider authenticatedUserProvider;
    private final UserService userService;

    @Override
    public ResponseEntity<UserDto> getCurrentUser() {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(userService.getUserDtoById(currentUser.id()));
    }
}
