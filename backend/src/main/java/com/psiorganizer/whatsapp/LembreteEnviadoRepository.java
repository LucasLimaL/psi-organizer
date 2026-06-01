package com.psiorganizer.whatsapp;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LembreteEnviadoRepository extends JpaRepository<LembreteEnviado, UUID> {

    Optional<LembreteEnviado> findByConsultaId(UUID consultaId);

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
}
