package com.psiorganizer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PsiOrganizerApplication {

    public static void main(String[] args) {
        SpringApplication.run(PsiOrganizerApplication.class, args);
    }
}
