package com.keith.battlereadyshelf.user;

import com.keith.battlereadyshelf.auth.AuthService;
import com.keith.battlereadyshelf.error.ForbiddenException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.error.UnauthorizedException;
import com.keith.battlereadyshelf.generated.model.UserDto;
import com.keith.battlereadyshelf.generated.model.UserRole;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
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

    public List<UserDto> getUsers() {
        return userRepository.findAll().stream().map(AuthService::toUserDto).toList();
    }

    public UserDto updateUserRole(
            CurrentAuthenticatedUser actingUser, UUID targetUserId, UserRole newRole) {
        var targetUser =
                userRepository
                        .findById(targetUserId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "User '%s' not found.".formatted(targetUserId)));

        if (targetUser.getRole() == Role.SUPERADMIN) {
            throw new ForbiddenException("The superadmin's role cannot be modified.");
        }
        if (newRole == UserRole.SUPERADMIN) {
            throw new ForbiddenException("The superadmin role cannot be assigned.");
        }
        if (targetUser.getId().equals(actingUser.id())) {
            throw new ForbiddenException("You cannot change your own role.");
        }

        targetUser.setRole(Role.valueOf(newRole.name()));
        return AuthService.toUserDto(userRepository.save(targetUser));
    }

    /**
     * Updates the role of multiple users in one request. Unlike {@link #updateUserRole}, invalid
     * targets (the superadmin, the acting admin themselves, or an unknown user id) are silently
     * skipped rather than failing the whole batch, since a bulk selection may legitimately include
     * a mix of eligible and ineligible users (e.g. a superadmin row that's disabled in the UI but
     * still included in a "select all" action).
     */
    public List<UserDto> bulkUpdateUserRoles(
            CurrentAuthenticatedUser actingUser, List<UUID> targetUserIds, UserRole newRole) {
        if (newRole == UserRole.SUPERADMIN) {
            throw new ForbiddenException("The superadmin role cannot be assigned.");
        }

        var updatedUsers =
                targetUserIds.stream()
                        .distinct()
                        .map(userRepository::findById)
                        .flatMap(Optional::stream)
                        .filter(user -> user.getRole() != Role.SUPERADMIN)
                        .filter(user -> !user.getId().equals(actingUser.id()))
                        .peek(user -> user.setRole(Role.valueOf(newRole.name())))
                        .toList();

        return userRepository.saveAll(updatedUsers).stream().map(AuthService::toUserDto).toList();
    }
}
