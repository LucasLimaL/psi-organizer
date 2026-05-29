package com.psiorganizer.common.validation;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TemplateValidoValidator implements ConstraintValidator<TemplateValido, String> {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([^{}]+)\\}");
    private static final Set<String> ACEITOS = Set.of("paciente", "psicologa", "data", "hora");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return false;
        Matcher m = PLACEHOLDER.matcher(value);
        while (m.find()) {
            if (!ACEITOS.contains(m.group(1))) return false;
        }
        return true;
    }
}
