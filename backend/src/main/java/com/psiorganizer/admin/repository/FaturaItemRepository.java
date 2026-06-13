package com.psiorganizer.admin.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.psiorganizer.admin.domain.FaturaItem;

public interface FaturaItemRepository extends JpaRepository<FaturaItem, UUID> {

    List<FaturaItem> findByFaturaIdInOrderByPeriodoInicioAsc(List<UUID> faturaIds);
}
