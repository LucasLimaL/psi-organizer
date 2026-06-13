package com.psiorganizer.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.admin.domain.Contrato;
import com.psiorganizer.admin.repository.ContratoRepository;
import com.psiorganizer.common.Endereco;
import com.psiorganizer.common.Fusos;
import com.psiorganizer.consulta.domain.Consulta;
import com.psiorganizer.consulta.domain.StatusConsulta;
import com.psiorganizer.consulta.repository.ConsultaRepository;
import com.psiorganizer.paciente.domain.Paciente;
import com.psiorganizer.paciente.repository.PacienteRepository;
import com.psiorganizer.psicologa.domain.Psicologa;
import com.psiorganizer.psicologa.repository.PsicologaRepository;

/**
 * Insere dados amostrais quando o banco está vazio e o ambiente NÃO é produção.
 *
 * Ativado em qualquer profile diferente de "prod" (default inclusive).
 * Em produção: rodar com -Dspring.profiles.active=prod para desativar.
 */
@Component
@Profile("!prod")
public class SeedDataRunner implements ApplicationRunner {

        private static final Logger log = LoggerFactory.getLogger(SeedDataRunner.class);

        private final PsicologaRepository psicologaRepo;
        private final PacienteRepository pacienteRepo;
        private final ConsultaRepository consultaRepo;
        private final ContratoRepository contratoRepo;
        private final PasswordEncoder encoder;

        public SeedDataRunner(PsicologaRepository psicologaRepo,
                        PacienteRepository pacienteRepo,
                        ConsultaRepository consultaRepo,
                        ContratoRepository contratoRepo,
                        PasswordEncoder encoder) {
                this.psicologaRepo = psicologaRepo;
                this.pacienteRepo = pacienteRepo;
                this.consultaRepo = consultaRepo;
                this.contratoRepo = contratoRepo;
                this.encoder = encoder;
        }

        @Override
        @Transactional
        public void run(ApplicationArguments args) {
                if (psicologaRepo.count() > 0) {
                        log.info("Seed: banco já populado, pulando.");
                        return;
                }
                log.info("Seed: banco vazio, inserindo dados amostrais...");

                Psicologa psi = new Psicologa(
                                UUID.randomUUID(),
                                "Dra. Ana Silva",
                                "ana@psi.com",
                                encoder.encode("senha123"),
                                "11144477735",
                                "CRP 06/12345",
                                "(11) 99999-0000",
                                new Endereco("01310100", "Av. Paulista", "1000", "10º andar",
                                                "Bela Vista", "São Paulo", "SP"),
                                31);
                psi.setEmailValidado(true);
                psicologaRepo.save(psi);

                // Cortesia de 1 mês — mesma regra do signup
                LocalDate hojeSP = LocalDate.now(Fusos.ZONA_BR);
                contratoRepo.save(new Contrato(UUID.randomUUID(), psi.getId(),
                                hojeSP, hojeSP.plusMonths(1).minusDays(1), BigDecimal.ZERO));

                Paciente p1 = new Paciente(
                                UUID.randomUUID(), psi.getId(),
                                "Maria Santos",
                                "39053344705",
                                LocalDate.of(1985, 5, 20),
                                "(11) 98888-1111", "maria@example.com",
                                new Endereco("04567000", "Rua das Flores", "123", null,
                                                "Vila Mariana", "São Paulo", "SP"),
                                new BigDecimal("180.00"),
                                "Atendida desde 2024.");
                pacienteRepo.save(p1);

                Paciente p2 = new Paciente(
                                UUID.randomUUID(), psi.getId(),
                                "João Pereira",
                                "52998224725",
                                LocalDate.of(1990, 11, 3),
                                "(11) 97777-2222", null,
                                new Endereco("05402000", "Rua Augusta", "456", "Apto 12",
                                                "Consolação", "São Paulo", "SP"),
                                new BigDecimal("180.00"),
                                null);
                pacienteRepo.save(p2);

                Paciente p3 = new Paciente(
                                UUID.randomUUID(), psi.getId(),
                                "Carla Oliveira",
                                "12345678909",
                                LocalDate.of(1995, 2, 14),
                                "(11) 96666-3333", "carla@example.com",
                                new Endereco("04101300", "Av. Brigadeiro Faria Lima", "2000", null,
                                                "Jardim Paulistano", "São Paulo", "SP"),
                                new BigDecimal("220.00"),
                                null);
                pacienteRepo.save(p3);

                LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);

                criarConsulta(psi.getId(), p1.getId(), hoje.minusDays(7).atTime(10, 0),
                                50, new BigDecimal("180.00"), StatusConsulta.REALIZADA, true,
                                "Sessão produtiva.");
                criarConsulta(psi.getId(), p2.getId(), hoje.minusDays(5).atTime(14, 0),
                                50, new BigDecimal("180.00"), StatusConsulta.REALIZADA, true, null);
                criarConsulta(psi.getId(), p3.getId(), hoje.minusDays(2).atTime(16, 0),
                                50, new BigDecimal("220.00"), StatusConsulta.FALTA, false,
                                "Não compareceu.");
                criarConsulta(psi.getId(), p1.getId(), hoje.atTime(15, 0),
                                50, new BigDecimal("180.00"), StatusConsulta.CONFIRMADA, false, null);
                criarConsulta(psi.getId(), p2.getId(), hoje.plusDays(1).atTime(10, 0),
                                50, new BigDecimal("180.00"), StatusConsulta.AGENDADA, false, null);
                criarConsulta(psi.getId(), p3.getId(), hoje.plusDays(8).atTime(11, 0),
                                50, new BigDecimal("220.00"), StatusConsulta.AGENDADA, false, null);

                log.info("Seed: 1 psicóloga, 3 pacientes, 6 consultas inseridos. "
                                + "Login: ana@psi.com / senha123");
        }

        private void criarConsulta(UUID psiId, UUID pacId, LocalDateTime inicio,
                        int duracao, BigDecimal valor,
                        StatusConsulta status, boolean pago, String obs) {
                Consulta c = new Consulta(UUID.randomUUID(), psiId, pacId,
                                inicio.atZone(Fusos.ZONA_BR).toInstant(), duracao, valor, obs);
                c.setStatus(status);
                c.setPago(pago);
                if (pago) {
                        // Aproxima um pagamento no dia seguinte à consulta
                        c.setPagoEm(c.getInicio().plus(java.time.Duration.ofDays(1)));
                }
                consultaRepo.save(c);
        }
}
