package com.psiorganizer.common.validation;

public final class CpfUtil {

    private CpfUtil() {}

    public static String somenteDigitos(String cpf) {
        if (cpf == null) return null;
        return cpf.replaceAll("\\D", "");
    }

    public static boolean isValido(String cpfRaw) {
        String cpf = somenteDigitos(cpfRaw);
        if (cpf == null || cpf.length() != 11) return false;
        if (cpf.chars().distinct().count() == 1) return false;

        int d1 = calcularDigito(cpf, 9);
        int d2 = calcularDigito(cpf, 10);
        return d1 == (cpf.charAt(9) - '0') && d2 == (cpf.charAt(10) - '0');
    }

    private static int calcularDigito(String cpf, int len) {
        int soma = 0;
        int peso = len + 1;
        for (int i = 0; i < len; i++) {
            soma += (cpf.charAt(i) - '0') * peso--;
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
