package com.psiorganizer.psicologa;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.Endereco;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.common.validation.CpfUtil;

@Service
public class PsicologaService {

    private final PsicologaRepository repository;
    private final PasswordEncoder passwordEncoder;

    public PsicologaService(PsicologaRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Psicologa criar(String nomeCompleto, String email, String senha,
                           String cpf, String crp, String telefone, Endereco endereco) {
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
                endereco);
        return repository.save(p);
    }

    @Transactional(readOnly = true)
    public Psicologa buscarPorId(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Psicóloga não encontrada"));
    }
}
