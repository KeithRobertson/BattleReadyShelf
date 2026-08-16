package com.keith.battlereadyshelf.user;

/**
 * A user's preferred UI colour scheme, persisted server-side so it follows them across devices.
 *
 * <ul>
 *   <li>{@link #LIGHT} - always use the light theme
 *   <li>{@link #DARK} - always use the dark theme
 *   <li>{@link #AUTO} - follow the device's system preference
 * </ul>
 */
public enum ThemePreference {
    LIGHT,
    DARK,
    AUTO
}
