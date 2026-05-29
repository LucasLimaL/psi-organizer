package com.psiorganizer.paciente;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PacienteRepository extends JpaRepository<Paciente, UUID> {
    List<Paciente> findByPsicologaIdAndAtivoOrderByNomeAsc(UUID psicologaId, boolean ativo);
    List<Paciente> findByPsicologaIdOrderByNomeAsc(UUID psicologaId);
    Optional<Paciente> findByIdAndPsicologaId(UUID id, UUID psicologaId);
    boolean existsByPsicologaIdAndCpf(UUID psicologaId, String cpf);
    int countByPsicologaIdAndAtivo(UUID psicologaId, boolean ativo);
}
