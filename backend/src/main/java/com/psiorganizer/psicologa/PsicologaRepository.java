package com.psiorganizer.psicologa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PsicologaRepository extends JpaRepository<Psicologa, UUID> {
    Optional<Psicologa> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByCpf(String cpf);
}
