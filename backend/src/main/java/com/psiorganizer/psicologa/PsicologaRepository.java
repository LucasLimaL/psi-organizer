package com.psiorganizer.psicologa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PsicologaRepository extends JpaRepository<Psicologa, UUID> {
    Optional<Psicologa> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByCpf(String cpf);

    /** Lista do painel admin — busca por nome ou e-mail, mais recentes primeiro. */
    @Query("""
            select p from Psicologa p
            where :busca = ''
               or lower(p.nomeCompleto) like lower(concat('%', :busca, '%'))
               or lower(p.email) like lower(concat('%', :busca, '%'))
            order by p.criadoEm desc
            """)
    List<Psicologa> buscarTodas(@Param("busca") String busca, Pageable pageable);

    @Query("""
            select count(p) from Psicologa p
            where :busca = ''
               or lower(p.nomeCompleto) like lower(concat('%', :busca, '%'))
               or lower(p.email) like lower(concat('%', :busca, '%'))
            """)
    long contarTodas(@Param("busca") String busca);
}
