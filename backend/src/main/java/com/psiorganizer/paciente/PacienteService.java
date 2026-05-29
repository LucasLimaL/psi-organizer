package com.psiorganizer.paciente;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.Endereco;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.common.validation.CpfUtil;
import com.psiorganizer.consulta.ConsultaRepository;

@Service
public class PacienteService {

    private final PacienteRepository pacienteRepository;
    private final ConsultaRepository consultaRepository;

    public PacienteService(PacienteRepository pacienteRepository,
                           ConsultaRepository consultaRepository) {
        this.pacienteRepository = pacienteRepository;
        this.consultaRepository = consultaRepository;
    }

    @Transactional(readOnly = true)
    public List<Paciente> listar(UUID psicologaId, boolean incluirInativos) {
        return incluirInativos
                ? pacienteRepository.findByPsicologaIdOrderByNomeAsc(psicologaId)
                : pacienteRepository.findByPsicologaIdAndAtivoOrderByNomeAsc(psicologaId, true);
    }

    @Transactional(readOnly = true)
    public Paciente buscar(UUID psicologaId, UUID id) {
        return pacienteRepository.findByIdAndPsicologaId(id, psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Paciente não encontrado"));
    }

    @Transactional
    public Paciente criar(UUID psicologaId, String nome, String cpf, LocalDate dataNascimento,
                          String telefone, String email, Endereco endereco,
                          BigDecimal valorConsulta, String observacoes, boolean optInWhatsapp) {
        String cpfNumerico = CpfUtil.somenteDigitos(cpf);
        if (pacienteRepository.existsByPsicologaIdAndCpf(psicologaId, cpfNumerico)) {
            throw ApiException.conflito("Já existe um paciente com este CPF");
        }
        Paciente p = new Paciente(UUID.randomUUID(), psicologaId, nome, cpfNumerico,
                dataNascimento, telefone, email, endereco, valorConsulta, observacoes);
        p.setOptInWhatsapp(optInWhatsapp);
        return pacienteRepository.save(p);
    }

    @Transactional
    public Paciente atualizar(UUID psicologaId, UUID id, String nome, String cpf,
                              LocalDate dataNascimento, String telefone, String email,
                              Endereco endereco, BigDecimal valorConsulta, String observacoes,
                              boolean optInWhatsapp) {
        Paciente p = buscar(psicologaId, id);
        String cpfNumerico = CpfUtil.somenteDigitos(cpf);
        if (!p.getCpf().equals(cpfNumerico)
                && pacienteRepository.existsByPsicologaIdAndCpf(psicologaId, cpfNumerico)) {
            throw ApiException.conflito("Já existe um paciente com este CPF");
        }
        p.setNome(nome);
        p.setCpf(cpfNumerico);
        p.setDataNascimento(dataNascimento);
        p.setTelefone(telefone);
        p.setEmail(email);
        p.setEndereco(endereco);
        p.setValorConsulta(valorConsulta);
        p.setObservacoes(observacoes);
        p.setOptInWhatsapp(optInWhatsapp);
        return pacienteRepository.save(p);
    }

    @Transactional
    public void inativar(UUID psicologaId, UUID id) {
        Paciente p = buscar(psicologaId, id);
        if (!p.isAtivo()) return;
        consultaRepository.apagarFuturasDoPaciente(p.getId(), Instant.now());
        p.setAtivo(false);
        pacienteRepository.save(p);
    }

    @Transactional
    public Paciente reativar(UUID psicologaId, UUID id) {
        Paciente p = buscar(psicologaId, id);
        if (p.isAtivo()) return p;
        p.setAtivo(true);
        return pacienteRepository.save(p);
    }
}
