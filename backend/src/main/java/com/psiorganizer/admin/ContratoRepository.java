package com.psiorganizer.admin;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContratoRepository extends JpaRepository<Contrato, UUID> {

    List<Contrato> findByPsicologaIdOrderByCriadoEmDesc(UUID psicologaId);

    Optional<Contrato> findFirstByPsicologaIdAndAtivoTrueOrderByCriadoEmDesc(UUID psicologaId);

    List<Contrato> findByPsicologaIdInAndAtivoTrue(List<UUID> psicologaIds);
}
