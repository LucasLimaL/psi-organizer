package com.psiorganizer.whatsapp;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoWhatsappRepository extends JpaRepository<ConfiguracaoWhatsapp, UUID> {

    Optional<ConfiguracaoWhatsapp> findByPsicologaId(UUID psicologaId);
}
