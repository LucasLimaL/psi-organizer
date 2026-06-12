package com.psiorganizer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI psiOrganizerOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("psi-organizer API")
                .description("API do sistema de organização para psicólogos")
                .version("0.0.1"));
    }
}
