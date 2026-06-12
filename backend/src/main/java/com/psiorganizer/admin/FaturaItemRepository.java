package com.psiorganizer.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FaturaItemRepository extends JpaRepository<FaturaItem, UUID> {

    List<FaturaItem> findByFaturaIdInOrderByPeriodoInicioAsc(List<UUID> faturaIds);
}
