package com.psiorganizer.paciente.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.psiorganizer.paciente.domain.Paciente;
import com.psiorganizer.psicologa.dto.EnderecoDto;

public record PacienteResponse(
        UUID id,
        String nome,
        String cpf,
        LocalDate dataNascimento,
        String telefone,
        String email,
        EnderecoDto endereco,
        BigDecimal valorConsulta,
        String observacoes,
        boolean ativo,
        boolean optInWhatsapp,
        Instant optInWhatsappEm
) {
    public static PacienteResponse fromDomain(Paciente p) {
        return new PacienteResponse(
                p.getId(),
                p.getNome(),
                p.getCpf(),
                p.getDataNascimento(),
                p.getTelefone(),
                p.getEmail(),
                EnderecoDto.fromDomain(p.getEndereco()),
                p.getValorConsulta(),
                p.getObservacoes(),
                p.isAtivo(),
                p.isOptInWhatsapp(),
                p.getOptInWhatsappEm());
    }
}
