package com.psiorganizer.whatsapp.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.psiorganizer.whatsapp.domain.ConfiguracaoWhatsapp;

public interface ConfiguracaoWhatsappRepository extends JpaRepository<ConfiguracaoWhatsapp, UUID> {

    Optional<ConfiguracaoWhatsapp> findByPsicologaId(UUID psicologaId);

    /**
     * Psicólogas com lembretes habilitados E não bloqueadas — usado pelo
     * LembreteScheduler. Conta bloqueada (inadimplência ou admin) não consome o
     * WhatsApp: é feature paga e não deve disparar mensagem em nome de conta
     * suspensa. Ver docs/BUSINESS_RULES.md §11.
     */
    @Query("select c from ConfiguracaoWhatsapp c where c.ativo = true "
            + "and not exists (select 1 from Psicologa p "
            + "where p.id = c.psicologaId and p.bloqueada = true)")
    List<ConfiguracaoWhatsapp> findAtivasDePsicologasNaoBloqueadas();
}
