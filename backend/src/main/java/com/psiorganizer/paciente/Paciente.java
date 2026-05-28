package com.psiorganizer.paciente;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

import com.psiorganizer.common.Endereco;

@Entity
@Table(name = "paciente")
public class Paciente {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "nome", nullable = false, length = 200)
    private String nome;

    @Column(name = "cpf", nullable = false, length = 11)
    private String cpf;

    @Column(name = "data_nascimento", nullable = false)
    private LocalDate dataNascimento;

    @Column(name = "telefone", nullable = false, length = 30)
    private String telefone;

    @Column(name = "email", length = 200)
    private String email;

    @Embedded
    private Endereco endereco;

    @Column(name = "valor_consulta", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorConsulta;

    @Column(name = "observacoes", columnDefinition = "text")
    private String observacoes;

    @Column(name = "ativo", nullable = false)
    private boolean ativo;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Paciente() {}

    public Paciente(UUID id, UUID psicologaId, String nome, String cpf, LocalDate dataNascimento,
                    String telefone, String email, Endereco endereco, BigDecimal valorConsulta,
                    String observacoes) {
        this.id = id;
        this.psicologaId = psicologaId;
        this.nome = nome;
        this.cpf = cpf;
        this.dataNascimento = dataNascimento;
        this.telefone = telefone;
        this.email = email;
        this.endereco = endereco;
        this.valorConsulta = valorConsulta;
        this.observacoes = observacoes;
        this.ativo = true;
        this.criadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }
    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate d) { this.dataNascimento = d; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String t) { this.telefone = t; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Endereco getEndereco() { return endereco; }
    public void setEndereco(Endereco e) { this.endereco = e; }
    public BigDecimal getValorConsulta() { return valorConsulta; }
    public void setValorConsulta(BigDecimal v) { this.valorConsulta = v; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String o) { this.observacoes = o; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public Instant getCriadoEm() { return criadoEm; }
}
