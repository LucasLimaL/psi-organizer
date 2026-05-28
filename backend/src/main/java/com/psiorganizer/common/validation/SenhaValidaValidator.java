package com.psiorganizer.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class SenhaValidaValidator implements ConstraintValidator<SenhaValida, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.length() < 8) return false;
        return value.chars().anyMatch(Character::isDigit);
    }
}
