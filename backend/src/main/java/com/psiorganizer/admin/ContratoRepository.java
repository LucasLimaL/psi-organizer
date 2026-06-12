package com.psiorganizer.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContratoRepository extends JpaRepository<Contrato, UUID> {

    List<Contrato> findByPsicologaIdOrderByDataInicioAsc(UUID psicologaId);

    List<Contrato> findByPsicologaIdInOrderByDataInicioAsc(List<UUID> psicologaIds);
}
