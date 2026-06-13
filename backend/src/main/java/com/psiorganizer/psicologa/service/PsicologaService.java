package com.psiorganizer.psicologa.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.admin.domain.Contrato;
import com.psiorganizer.admin.repository.ContratoRepository;
import com.psiorganizer.common.Endereco;
import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.common.validation.CpfUtil;
import com.psiorganizer.psicologa.domain.Psicologa;
import com.psiorganizer.psicologa.repository.PsicologaRepository;

@Service
public class PsicologaService {

    private final PsicologaRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final ContratoRepository contratoRepository;

    public PsicologaService(PsicologaRepository repository, PasswordEncoder passwordEncoder,
                            ContratoRepository contratoRepository) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.contratoRepository = contratoRepository;
    }

    @Transactional
    public Psicologa criar(String nomeCompleto, String email, String senha,
                           String cpf, String crp, String telefone, int diaFechamento,
                           Endereco endereco, boolean emailValidado) {
        String cpfNumerico = CpfUtil.somenteDigitos(cpf);
        if (repository.existsByEmail(email)) {
            throw ApiException.conflito("E-mail já cadastrado");
        }
        if (repository.existsByCpf(cpfNumerico)) {
            throw ApiException.conflito("CPF já cadastrado");
        }
        Psicologa p = new Psicologa(
                UUID.randomUUID(),
                nomeCompleto,
                email,
                passwordEncoder.encode(senha),
                cpfNumerico,
                crp,
                telefone,
                endereco,
                diaFechamento);
        p.setEmailValidado(emailValidado);
        repository.save(p);
        // Cortesia: 1 mês de contrato a R$ 0 a partir do cadastro. As faturas
        // de valor zero nascem pagas; expirou sem contrato novo → situação
        // irregular no próximo login (funil de conversão).
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        contratoRepository.save(new Contrato(UUID.randomUUID(), p.getId(),
                hoje, hoje.plusMonths(1).minusDays(1), BigDecimal.ZERO));
        return p;
    }

    @Transactional(readOnly = true)
    public Psicologa buscarPorId(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Psicólogo não encontrado"));
    }

    @Transactional
    public void alterarSenha(UUID id, String senhaAtual, String novaSenha) {
        Psicologa p = buscarPorId(id);
        if (!passwordEncoder.matches(senhaAtual, p.getSenhaHash())) {
            throw ApiException.requisicaoInvalida("Senha atual incorreta");
        }
        p.setSenhaHash(passwordEncoder.encode(novaSenha));
        repository.save(p);
    }

    @Transactional
    public Psicologa atualizarPerfil(UUID id, String nomeCompleto, String crp,
                                     String telefone, Endereco endereco) {
        Psicologa p = buscarPorId(id);
        p.setNomeCompleto(nomeCompleto);
        p.setCrp(crp);
        p.setTelefone(telefone);
        p.setEndereco(endereco);
        return repository.save(p);
    }

    /**
     * Preferências de uso — editadas na aba Configurações, separadas do perfil:
     * cobrança de faltas e duração padrão das consultas.
     */
    @Transactional
    public Psicologa atualizarPreferencias(UUID id, boolean cobrarFaltas, int duracaoPadraoMinutos) {
        Psicologa p = buscarPorId(id);
        p.setCobrarFaltas(cobrarFaltas);
        p.setDuracaoPadraoMinutos(duracaoPadraoMinutos);
        return repository.save(p);
    }
}
