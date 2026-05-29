package com.psiorganizer.whatsapp;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LembreteEnviadoRepository extends JpaRepository<LembreteEnviado, UUID> {

    Optional<LembreteEnviado> findByConsultaId(UUID consultaId);
}
