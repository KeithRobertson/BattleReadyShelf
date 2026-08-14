package com.keith.battlereadyshelf.user;

/**
 * Roles available for {@link User RBAC}.
 *
 * <ul>
 *   <li>{@link #USER} - can use the application (create/manage their own collections, models,
 *       etc.)
 *   <li>{@link #ADMIN} - a {@link #USER} that can also access the admin screen and adjust other
 *       users' roles
 *   <li>{@link #SUPERADMIN} - has all permissions. Reserved for the application owner's account;
 *       cannot be modified or assigned via the API.
 * </ul>
 */
public enum Role {
    USER,
    ADMIN,
    SUPERADMIN
}
