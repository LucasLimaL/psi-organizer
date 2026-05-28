package com.psiorganizer.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SenhaValidaValidator.class)
public @interface SenhaValida {
    String message() default "Senha precisa ter no mínimo 8 caracteres e ao menos 1 dígito";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
