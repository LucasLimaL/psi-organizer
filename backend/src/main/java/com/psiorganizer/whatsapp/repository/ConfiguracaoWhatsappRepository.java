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
     * LembreteScheduler para NÃO INICIAR novos lembretes de conta bloqueada
     * (inadimplência ou admin), já que é feature paga. Escopo: apenas a iniciação.
     * Conversas já em andamento (resposta da paciente via webhook a um lembrete
     * enviado ANTES do bloqueio) não são interrompidas por aqui — o inbound não
     * checa bloqueio. Ver docs/BUSINESS_RULES.md §11.
     */
    @Query("select c from ConfiguracaoWhatsapp c where c.ativo = true "
            + "and not exists (select 1 from Psicologa p "
            + "where p.id = c.psicologaId and p.bloqueada = true)")
    List<ConfiguracaoWhatsapp> findAtivasDePsicologasNaoBloqueadas();
}
