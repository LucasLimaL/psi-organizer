package com.psiorganizer.psicologa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.psiorganizer.common.Endereco;

public record EnderecoDto(
        @NotBlank @Pattern(regexp = "\\d{8}", message = "CEP precisa ter 8 dígitos") String cep,
        @NotBlank String logradouro,
        @NotBlank String numero,
        String complemento,
        @NotBlank String bairro,
        @NotBlank String cidade,
        @NotBlank @Size(min = 2, max = 2) String uf
) {
    public Endereco toDomain() {
        return new Endereco(cep, logradouro, numero, complemento, bairro, cidade, uf);
    }

    public static EnderecoDto fromDomain(Endereco e) {
        return new EnderecoDto(e.getCep(), e.getLogradouro(), e.getNumero(),
                e.getComplemento(), e.getBairro(), e.getCidade(), e.getUf());
    }
}
