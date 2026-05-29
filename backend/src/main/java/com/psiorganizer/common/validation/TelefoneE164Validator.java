package com.psiorganizer.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber;

public class TelefoneE164Validator implements ConstraintValidator<TelefoneE164, String> {

    private static final PhoneNumberUtil UTIL = PhoneNumberUtil.getInstance();

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return false;
        try {
            PhoneNumber numero = UTIL.parse(value, "BR");
            return UTIL.isValidNumber(numero)
                    && UTIL.format(numero, PhoneNumberUtil.PhoneNumberFormat.E164).equals(value);
        } catch (NumberParseException e) {
            return false;
        }
    }
}
