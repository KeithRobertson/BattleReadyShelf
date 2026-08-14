package com.keith.battlereadyshelf.user;

import com.keith.battlereadyshelf.generated.api.UsersApi;
import com.keith.battlereadyshelf.generated.model.BulkUpdateUserRolesRequest;
import com.keith.battlereadyshelf.generated.model.UpdateUserRoleRequest;
import com.keith.battlereadyshelf.generated.model.UserDto;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

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

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDto>> getUsers() {
        return ResponseEntity.ok(userService.getUsers());
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> updateUserRole(
            UUID userId, UpdateUserRoleRequest updateUserRoleRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                userService.updateUserRole(
                        currentUser, userId, updateUserRoleRequest.getRole()));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDto>> bulkUpdateUserRoles(
            BulkUpdateUserRolesRequest bulkUpdateUserRolesRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                userService.bulkUpdateUserRoles(
                        currentUser,
                        bulkUpdateUserRolesRequest.getUserIds(),
                        bulkUpdateUserRolesRequest.getRole()));
    }
}
