package com.psiorganizer.whatsapp;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LembreteEnviadoRepository extends JpaRepository<LembreteEnviado, UUID> {

    Optional<LembreteEnviado> findByConsultaId(UUID consultaId);

    List<LembreteEnviado> findByConsultaIdIn(java.util.Collection<UUID> consultaIds);

    /**
     * Insert idempotente. Postgres `ON CONFLICT (consulta_id) DO NOTHING` garante que,
     * se outro worker já criou o registro pra essa consulta, esta operação não causa
     * erro nem duplica — apenas retorna 0 rows affected.
     *
     * Retorna o número de linhas inseridas (0 ou 1). Caller decide se prossegue com o
     * envio Meta (1) ou desiste (0, já existe).
     */
    @Modifying
    @Query(
            value = """
                    INSERT INTO lembrete_enviado
                        (id, consulta_id, psicologa_id, status_entrega, etapa,
                         confirmacao_dupla_tentativas, ciclos_voltar)
                    VALUES
                        (:id, :consultaId, :psicologaId, 'PENDENTE', 'AGUARDANDO_ESCOLHA', 0, 0)
                    ON CONFLICT (consulta_id) DO NOTHING
                    """,
            nativeQuery = true)
    int inserirSeNaoExiste(@Param("id") UUID id,
                           @Param("consultaId") UUID consultaId,
                           @Param("psicologaId") UUID psicologaId);

    /**
     * Lookup primário do webhook por context.id. Bate em Msg 1 (mensagem_id_externa)
     * ou em Msg 2 (mensagem_confirmacao_dupla_id) — qualquer das duas que a paciente
     * tenha respondido.
     */
    @Query("""
            select le from LembreteEnviado le
            where le.mensagemIdExterna = :externalId
               or le.mensagemConfirmacaoDuplaId = :externalId
            """)
    Optional<LembreteEnviado> findByMensagemExterna(@Param("externalId") String externalId);

    /**
     * Fallback do webhook: telefone normalizado (apenas dígitos) + janela 48h. Usa
     * regexp_replace pra normalizar o telefone do paciente.
     */
    @Query(
            value = """
                    SELECT le.* FROM lembrete_enviado le
                    JOIN consulta c ON c.id = le.consulta_id
                    JOIN paciente p ON p.id = c.paciente_id
                    WHERE regexp_replace(p.telefone, '\\D', '', 'g') = :telefoneDigitos
                      AND le.enviado_em > NOW() - INTERVAL '48 hours'
                    ORDER BY le.enviado_em DESC
                    LIMIT 1
                    """,
            nativeQuery = true)
    Optional<LembreteEnviado> findByTelefoneRecente(
            @Param("telefoneDigitos") String telefoneDigitos);

    /** Passo (c) do scheduler: lembretes em AGUARDANDO_CONFIRMACAO_DUPLA pra retry/EXPIRADO. */
    @Query("""
            select le from LembreteEnviado le
            where le.etapa = com.psiorganizer.whatsapp.EtapaLembrete.AGUARDANDO_CONFIRMACAO_DUPLA
              and le.confirmacaoDuplaEnviadaEm < :limiteUmaHora
            """)
    List<LembreteEnviado> findPendentesConfirmacaoDupla(
            @Param("limiteUmaHora") java.time.Instant limiteUmaHora);
}
