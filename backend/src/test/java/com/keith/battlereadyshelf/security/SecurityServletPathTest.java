package com.keith.battlereadyshelf.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionsController;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionsService;
import com.keith.battlereadyshelf.auth.AuthController;
import com.keith.battlereadyshelf.auth.AuthService;
import com.keith.battlereadyshelf.configuration.CorsConfiguration;
import com.keith.battlereadyshelf.error.ApiExceptionHandler;
import com.keith.battlereadyshelf.generated.model.AuthResponse;
import com.keith.battlereadyshelf.generated.model.UserDto;
import com.keith.battlereadyshelf.user.UserController;
import com.keith.battlereadyshelf.user.UserService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

@SpringBootTest(
        classes = SecurityServletPathTest.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "spring.mvc.servlet.path=/battlereadyshelf",
            "google.oauth.client-id=test-client",
            "battlereadyshelf.cors.allowed.origins=http://localhost:5173"
        })
@AutoConfigureMockMvc
class SecurityServletPathTest {
    @Autowired private MockMvc mockMvc;

    @MockitoBean private AuthService authService;

    @MockitoBean private UserService userService;

    @MockitoBean private ArmyCollectionsService armyCollectionsService;

    @MockitoBean private AuthenticatedUserProvider authenticatedUserProvider;

    @MockitoBean private JwtService jwtService;

    @Test
    void postToServletPrefixedAuthEndpoint_isPermittedBySecurityMatcherWithoutServletPrefix()
            throws Exception {
        when(authService.authenticateWithGoogle(any()))
                .thenReturn(
                        new AuthResponse(
                                "jwt-token",
                                new UserDto(UUID.randomUUID(), "allowed@example.com")
                                        .displayName("Allowed User")));

        mockMvc.perform(
                        post("/battlereadyshelf/api/v1/auth/google")
                                .servletPath("/battlereadyshelf")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {"idToken":"google-id-token"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"));
    }

    @Test
    void protectedServletPrefixedEndpoint_requiresBearerToken() throws Exception {
        mockMvc.perform(get("/battlereadyshelf/api/v1/users/me").servletPath("/battlereadyshelf"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("A valid bearer token is required."));
    }

    @Test
    void preflightRequest_allowsAuthorizationHeader() throws Exception {
        var result =
                mockMvc.perform(
                                options("/battlereadyshelf/api/v1/users/me")
                                        .servletPath("/battlereadyshelf")
                                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                                        .header(
                                                HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS,
                                                "Authorization"))
                        .andExpect(status().isOk())
                        .andReturn();

        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS))
                .containsIgnoringCase("Authorization");
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration(
            excludeName = {
                "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
                "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration",
                "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration",
                "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration"
            })
    @Import({
        AuthController.class,
        UserController.class,
        ArmyCollectionsController.class,
        SecurityConfiguration.class,
        JwtAuthenticationFilter.class,
        RestAuthenticationEntryPoint.class,
        ApiExceptionHandler.class,
        CorsConfiguration.class,
        TestConfig.class
    })
    static class TestApplication {}
}
