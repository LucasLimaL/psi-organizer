package com.psiorganizer.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class Endereco {

    @Column(name = "endereco_cep", nullable = false, length = 8)
    private String cep;

    @Column(name = "endereco_logradouro", nullable = false, length = 200)
    private String logradouro;

    @Column(name = "endereco_numero", nullable = false, length = 20)
    private String numero;

    @Column(name = "endereco_complemento", length = 100)
    private String complemento;

    @Column(name = "endereco_bairro", nullable = false, length = 100)
    private String bairro;

    @Column(name = "endereco_cidade", nullable = false, length = 100)
    private String cidade;

    @Column(name = "endereco_uf", nullable = false, length = 2)
    private String uf;

    public Endereco() {}

    public Endereco(String cep, String logradouro, String numero, String complemento,
                    String bairro, String cidade, String uf) {
        this.cep = cep;
        this.logradouro = logradouro;
        this.numero = numero;
        this.complemento = complemento;
        this.bairro = bairro;
        this.cidade = cidade;
        this.uf = uf;
    }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }
    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }
}
