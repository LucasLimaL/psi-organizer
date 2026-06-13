package com.psiorganizer.psicologa.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

import com.psiorganizer.common.Endereco;

@Entity
@Table(name = "psicologa")
public class Psicologa {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "nome_completo", nullable = false, length = 200)
    private String nomeCompleto;

    @Column(name = "email", nullable = false, length = 200, unique = true)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(name = "cpf", nullable = false, length = 11, unique = true)
    private String cpf;

    @Column(name = "crp", nullable = false, length = 50)
    private String crp;

    @Column(name = "telefone", nullable = false, length = 30)
    private String telefone;

    @Embedded
    private Endereco endereco;

    /** Conta de gestão do sistema — acessa o painel /admin. Nunca setado via signup. */
    @Column(name = "admin", nullable = false)
    private boolean admin;

    /** Bloqueio vale a partir do PRÓXIMO login (token vigente expira sozinho em 24h). */
    @Column(name = "bloqueada", nullable = false)
    private boolean bloqueada;

    @Column(name = "bloqueada_em")
    private Instant bloqueadaEm;

    /** ADMIN (manual) ou INADIMPLENCIA (automático — desfeito na regularização). */
    @Column(name = "bloqueada_motivo", length = 20)
    private String bloqueadaMotivo;

    /**
     * Dia de fechamento da fatura (1-31, escolhido no signup). Mês mais curto
     * fecha no último dia. Vencimento = fechamento + 7 dias corridos.
     */
    @Column(name = "dia_fechamento", nullable = false)
    private int diaFechamento;

    /**
     * Consultas com status FALTA entram na cobrança? Preferência da psicóloga
     * (Perfil → Cobrança). FALTA já paga conta sempre, independente do valor.
     */
    @Column(name = "cobrar_faltas", nullable = false)
    private boolean cobrarFaltas = true;

    /** Conta só loga depois de validar o e-mail. Contas pré-existentes nascem validadas (V10). */
    @Column(name = "email_validado", nullable = false)
    private boolean emailValidado;

    /** SHA-256 (hex) do token de validação enviado por e-mail — nunca o token em claro. */
    @Column(name = "validacao_token_hash", length = 64)
    private String validacaoTokenHash;

    @Column(name = "validacao_token_expira_em")
    private Instant validacaoTokenExpiraEm;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Psicologa() {}

    public Psicologa(UUID id, String nomeCompleto, String email, String senhaHash,
                     String cpf, String crp, String telefone, Endereco endereco,
                     int diaFechamento) {
        this.id = id;
        this.nomeCompleto = nomeCompleto;
        this.email = email;
        this.senhaHash = senhaHash;
        this.cpf = cpf;
        this.crp = crp;
        this.telefone = telefone;
        this.endereco = endereco;
        this.diaFechamento = diaFechamento;
        this.criadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public String getNomeCompleto() { return nomeCompleto; }
    public void setNomeCompleto(String n) { this.nomeCompleto = n; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String s) { this.senhaHash = s; }
    public String getCpf() { return cpf; }
    public String getCrp() { return crp; }
    public void setCrp(String crp) { this.crp = crp; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String t) { this.telefone = t; }
    public Endereco getEndereco() { return endereco; }
    public void setEndereco(Endereco e) { this.endereco = e; }

    public boolean isAdmin() { return admin; }

    public boolean isBloqueada() { return bloqueada; }
    public void setBloqueada(boolean bloqueada) { this.bloqueada = bloqueada; }

    public Instant getBloqueadaEm() { return bloqueadaEm; }
    public void setBloqueadaEm(Instant b) { this.bloqueadaEm = b; }

    public String getBloqueadaMotivo() { return bloqueadaMotivo; }
    public void setBloqueadaMotivo(String m) { this.bloqueadaMotivo = m; }

    public int getDiaFechamento() { return diaFechamento; }

    public boolean isCobrarFaltas() { return cobrarFaltas; }
    public void setCobrarFaltas(boolean c) { this.cobrarFaltas = c; }

    public boolean isEmailValidado() { return emailValidado; }
    public void setEmailValidado(boolean v) { this.emailValidado = v; }

    public String getValidacaoTokenHash() { return validacaoTokenHash; }
    public void setValidacaoTokenHash(String h) { this.validacaoTokenHash = h; }

    public Instant getValidacaoTokenExpiraEm() { return validacaoTokenExpiraEm; }
    public void setValidacaoTokenExpiraEm(Instant e) { this.validacaoTokenExpiraEm = e; }

    public Instant getCriadoEm() { return criadoEm; }
}
