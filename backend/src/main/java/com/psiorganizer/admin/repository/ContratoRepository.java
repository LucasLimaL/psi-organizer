package com.psiorganizer.admin.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.psiorganizer.admin.domain.Contrato;

public interface ContratoRepository extends JpaRepository<Contrato, UUID> {

    List<Contrato> findByPsicologaIdOrderByDataInicioAsc(UUID psicologaId);

    List<Contrato> findByPsicologaIdInOrderByDataInicioAsc(List<UUID> psicologaIds);
}
