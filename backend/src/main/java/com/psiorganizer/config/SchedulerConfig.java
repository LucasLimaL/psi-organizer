package com.psiorganizer.config;

import javax.sql.DataSource;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;

/**
 * Habilita @Scheduled em toda a aplicação + ShedLock pra evitar duplo-disparo
 * caso futuramente rode em mais de uma instância. Em single-instance hoje, o
 * ShedLock é praticamente no-op mas custa quase nada — instalamos já pra não
 * precisar mexer no scheduler quando escalar horizontalmente.
 */
@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "PT55M")
public class SchedulerConfig {

    @Bean
    LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(dataSource);
    }
}
