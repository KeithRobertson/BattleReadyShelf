package com.keith.battlereadyshelf.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.error.ForbiddenException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.UserRole;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void updateUserRole_throwsNotFoundWhenTargetUserDoesNotExist() {
        var adminId = UUID.randomUUID();
        var targetId = UUID.randomUUID();
        var actingAdmin = new CurrentAuthenticatedUser(adminId, "admin@example.com", Role.ADMIN);
        when(userRepository.findById(targetId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUserRole(actingAdmin, targetId, UserRole.ADMIN))
                .isInstanceOf(NotFoundException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUserRole_throwsForbiddenWhenTargetIsSuperadmin() {
        var adminId = UUID.randomUUID();
        var targetId = UUID.randomUUID();
        var actingAdmin = new CurrentAuthenticatedUser(adminId, "admin@example.com", Role.ADMIN);
        var superadmin =
                User.builder()
                        .id(targetId)
                        .email("superadmin@example.com")
                        .role(Role.SUPERADMIN)
                        .build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(superadmin));

        assertThatThrownBy(() -> userService.updateUserRole(actingAdmin, targetId, UserRole.USER))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("The superadmin's role cannot be modified.");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUserRole_throwsForbiddenWhenAssigningSuperadminRole() {
        var adminId = UUID.randomUUID();
        var targetId = UUID.randomUUID();
        var actingAdmin = new CurrentAuthenticatedUser(adminId, "admin@example.com", Role.ADMIN);
        var targetUser =
                User.builder().id(targetId).email("user@example.com").role(Role.USER).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        assertThatThrownBy(
                        () -> userService.updateUserRole(actingAdmin, targetId, UserRole.SUPERADMIN))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("The superadmin role cannot be assigned.");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUserRole_throwsForbiddenWhenChangingOwnRole() {
        var adminId = UUID.randomUUID();
        var actingAdmin = new CurrentAuthenticatedUser(adminId, "admin@example.com", Role.ADMIN);
        var self = User.builder().id(adminId).email("admin@example.com").role(Role.ADMIN).build();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(self));

        assertThatThrownBy(() -> userService.updateUserRole(actingAdmin, adminId, UserRole.USER))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You cannot change your own role.");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUserRole_updatesRoleForOtherUser() {
        var adminId = UUID.randomUUID();
        var targetId = UUID.randomUUID();
        var actingAdmin = new CurrentAuthenticatedUser(adminId, "admin@example.com", Role.ADMIN);
        var targetUser =
                User.builder().id(targetId).email("user@example.com").role(Role.USER).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = userService.updateUserRole(actingAdmin, targetId, UserRole.ADMIN);

        assertThat(result.getRole()).isEqualTo(UserRole.ADMIN);
        verify(userRepository).save(targetUser);
    }
}
