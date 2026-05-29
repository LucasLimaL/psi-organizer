package com.psiorganizer.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TemplateValidoValidator.class)
public @interface TemplateValido {
    String message() default "Template inválido: apenas os placeholders {paciente}, {psicologa}, {data}, {hora} são aceitos";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
