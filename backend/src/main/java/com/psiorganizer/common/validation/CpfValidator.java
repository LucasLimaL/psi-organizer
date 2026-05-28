package com.psiorganizer.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CpfValidator implements ConstraintValidator<Cpf, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value != null && CpfUtil.isValido(value);
    }
}
