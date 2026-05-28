package com.psiorganizer.psicologa.dto;

import java.util.UUID;

import com.psiorganizer.psicologa.Psicologa;

public record PsicologaResponse(
        UUID id,
        String nomeCompleto,
        String email,
        String cpf,
        String crp,
        String telefone,
        EnderecoDto endereco
) {
    public static PsicologaResponse fromDomain(Psicologa p) {
        return new PsicologaResponse(
                p.getId(),
                p.getNomeCompleto(),
                p.getEmail(),
                p.getCpf(),
                p.getCrp(),
                p.getTelefone(),
                EnderecoDto.fromDomain(p.getEndereco()));
    }
}
