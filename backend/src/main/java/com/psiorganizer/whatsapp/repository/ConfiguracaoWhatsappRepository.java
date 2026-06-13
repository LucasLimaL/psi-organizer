package com.psiorganizer.whatsapp.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.psiorganizer.whatsapp.domain.ConfiguracaoWhatsapp;

public interface ConfiguracaoWhatsappRepository extends JpaRepository<ConfiguracaoWhatsapp, UUID> {

    Optional<ConfiguracaoWhatsapp> findByPsicologaId(UUID psicologaId);

    /** Psicólogas com lembretes habilitados — usado pelo LembreteScheduler. */
    List<ConfiguracaoWhatsapp> findByAtivoTrue();
}
