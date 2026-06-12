package com.psiorganizer.psicologa;

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

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Psicologa() {}

    public Psicologa(UUID id, String nomeCompleto, String email, String senhaHash,
                     String cpf, String crp, String telefone, Endereco endereco) {
        this.id = id;
        this.nomeCompleto = nomeCompleto;
        this.email = email;
        this.senhaHash = senhaHash;
        this.cpf = cpf;
        this.crp = crp;
        this.telefone = telefone;
        this.endereco = endereco;
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

    public Instant getCriadoEm() { return criadoEm; }
}
