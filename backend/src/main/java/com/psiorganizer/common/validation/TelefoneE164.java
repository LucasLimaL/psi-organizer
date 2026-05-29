package com.psiorganizer.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TelefoneE164Validator.class)
public @interface TelefoneE164 {
    String message() default "Telefone deve estar em formato E.164 (ex: +5511987654321)";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
