package com.keith.battlereadyshelf.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfiguration {

    // Spring Boot 4 only auto-configures a Jackson 3 (tools.jackson) ObjectMapper bean by
    // default; we still need classic Jackson 2 to serialize/deserialize the openapi-generated
    // DTOs (ApiError, ModelDefinition, etc.), so we define a single shared bean here rather than
    // instantiating "new ObjectMapper()" ad hoc in every class that needs one.
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
