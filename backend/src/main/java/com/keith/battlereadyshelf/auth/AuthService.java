package com.keith.battlereadyshelf.auth;

import com.keith.battlereadyshelf.error.ForbiddenException;
import com.keith.battlereadyshelf.generated.model.AuthResponse;
import com.keith.battlereadyshelf.generated.model.GoogleAuthRequest;
import com.keith.battlereadyshelf.generated.model.UserDto;
import com.keith.battlereadyshelf.generated.model.UserRole;
import com.keith.battlereadyshelf.security.JwtService;
import com.keith.battlereadyshelf.user.AllowedEmailRepository;
import com.keith.battlereadyshelf.user.Role;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final GoogleIdTokenVerificationService googleIdTokenVerificationService;
    private final AllowedEmailRepository allowedEmailRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final String superadminEmail;

    public AuthService(
            GoogleIdTokenVerificationService googleIdTokenVerificationService,
            AllowedEmailRepository allowedEmailRepository,
            UserRepository userRepository,
            JwtService jwtService,
            @Value("${battlereadyshelf.superadmin.email:}") String superadminEmail) {
        this.googleIdTokenVerificationService = googleIdTokenVerificationService;
        this.allowedEmailRepository = allowedEmailRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.superadminEmail = superadminEmail;
    }

    public AuthResponse authenticateWithGoogle(GoogleAuthRequest googleAuthRequest) {
        var verifiedGoogleUser =
                googleIdTokenVerificationService.verify(googleAuthRequest.getIdToken());
        if (!allowedEmailRepository.existsById(verifiedGoogleUser.email())) {
            throw new ForbiddenException(
                    "Email '%s' is not allowed to access BattleReadyShelf."
                            .formatted(verifiedGoogleUser.email()));
        }

        var user =
                userRepository
                        .findByEmail(verifiedGoogleUser.email())
                        .map(
                                existingUser ->
                                        updateDisplayNameIfMissing(
                                                existingUser, verifiedGoogleUser))
                        .orElseGet(
                                () ->
                                        userRepository.save(
                                                User.builder()
                                                        .email(verifiedGoogleUser.email())
                                                        .displayName(
                                                                verifiedGoogleUser.displayName())
                                                        .role(roleFor(verifiedGoogleUser.email()))
                                                        .build()));
        user = ensureSuperadminRole(user);

        return new AuthResponse(jwtService.generateToken(user), toUserDto(user));
    }

    private Role roleFor(String email) {
        return isSuperadminEmail(email) ? Role.SUPERADMIN : Role.USER;
    }

    private boolean isSuperadminEmail(String email) {
        return !superadminEmail.isBlank() && superadminEmail.equalsIgnoreCase(email);
    }

    private User ensureSuperadminRole(User user) {
        if (isSuperadminEmail(user.getEmail()) && user.getRole() != Role.SUPERADMIN) {
            user.setRole(Role.SUPERADMIN);
            return userRepository.save(user);
        }
        return user;
    }

    private User updateDisplayNameIfMissing(
            User existingUser, VerifiedGoogleUser verifiedGoogleUser) {
        if (existingUser.getDisplayName() == null && verifiedGoogleUser.displayName() != null) {
            existingUser.setDisplayName(verifiedGoogleUser.displayName());
            return userRepository.save(existingUser);
        }
        return existingUser;
    }

    public static UserDto toUserDto(User user) {
        return new UserDto(user.getId(), user.getEmail())
                .displayName(user.getDisplayName())
                .role(UserRole.valueOf(user.getRole().name()));
    }
}
