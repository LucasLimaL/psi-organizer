package com.psiorganizer.whatsapp.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "lembrete_enviado")
public class LembreteEnviado {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "consulta_id", nullable = false, unique = true)
    private UUID consultaId;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "enviado_em")
    private Instant enviadoEm;

    @Column(name = "mensagem_id_externa", length = 128)
    private String mensagemIdExterna;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_entrega", nullable = false, length = 16)
    private StatusEntrega statusEntrega;

    @Column(name = "erro_codigo", length = 32)
    private String erroCodigo;

    @Column(name = "erro_descricao", columnDefinition = "text")
    private String erroDescricao;

    @Enumerated(EnumType.STRING)
    @Column(name = "etapa", nullable = false, length = 32)
    private EtapaLembrete etapa;

    @Enumerated(EnumType.STRING)
    @Column(name = "escolha_inicial", length = 16)
    private EscolhaLembrete escolhaInicial;

    @Column(name = "mensagem_confirmacao_dupla_id", length = 128)
    private String mensagemConfirmacaoDuplaId;

    @Column(name = "confirmacao_dupla_enviada_em")
    private Instant confirmacaoDuplaEnviadaEm;

    @Column(name = "confirmacao_dupla_tentativas", nullable = false)
    private int confirmacaoDuplaTentativas;

    @Column(name = "ciclos_voltar", nullable = false)
    private int ciclosVoltar;

    @Enumerated(EnumType.STRING)
    @Column(name = "escolha_final", length = 16)
    private EscolhaLembrete escolhaFinal;

    @Column(name = "finalizado_em")
    private Instant finalizadoEm;

    protected LembreteEnviado() {}

    public LembreteEnviado(UUID id, UUID consultaId, UUID psicologaId) {
        this.id = id;
        this.consultaId = consultaId;
        this.psicologaId = psicologaId;
        this.statusEntrega = StatusEntrega.PENDENTE;
        this.etapa = EtapaLembrete.AGUARDANDO_ESCOLHA;
        this.confirmacaoDuplaTentativas = 0;
        this.ciclosVoltar = 0;
    }

    public UUID getId() { return id; }
    public UUID getConsultaId() { return consultaId; }
    public UUID getPsicologaId() { return psicologaId; }

    public Instant getEnviadoEm() { return enviadoEm; }
    public void setEnviadoEm(Instant enviadoEm) { this.enviadoEm = enviadoEm; }

    public String getMensagemIdExterna() { return mensagemIdExterna; }
    public void setMensagemIdExterna(String m) { this.mensagemIdExterna = m; }

    public StatusEntrega getStatusEntrega() { return statusEntrega; }
    public void setStatusEntrega(StatusEntrega s) { this.statusEntrega = s; }

    public String getErroCodigo() { return erroCodigo; }
    public void setErroCodigo(String e) { this.erroCodigo = e; }

    public String getErroDescricao() { return erroDescricao; }
    public void setErroDescricao(String e) { this.erroDescricao = e; }

    public EtapaLembrete getEtapa() { return etapa; }
    public void setEtapa(EtapaLembrete etapa) { this.etapa = etapa; }

    public EscolhaLembrete getEscolhaInicial() { return escolhaInicial; }
    public void setEscolhaInicial(EscolhaLembrete e) { this.escolhaInicial = e; }

    public String getMensagemConfirmacaoDuplaId() { return mensagemConfirmacaoDuplaId; }
    public void setMensagemConfirmacaoDuplaId(String m) { this.mensagemConfirmacaoDuplaId = m; }

    public Instant getConfirmacaoDuplaEnviadaEm() { return confirmacaoDuplaEnviadaEm; }
    public void setConfirmacaoDuplaEnviadaEm(Instant c) { this.confirmacaoDuplaEnviadaEm = c; }

    public int getConfirmacaoDuplaTentativas() { return confirmacaoDuplaTentativas; }
    public void setConfirmacaoDuplaTentativas(int n) { this.confirmacaoDuplaTentativas = n; }

    public int getCiclosVoltar() { return ciclosVoltar; }
    public void setCiclosVoltar(int n) { this.ciclosVoltar = n; }

    public EscolhaLembrete getEscolhaFinal() { return escolhaFinal; }
    public void setEscolhaFinal(EscolhaLembrete e) { this.escolhaFinal = e; }

    public Instant getFinalizadoEm() { return finalizadoEm; }
    public void setFinalizadoEm(Instant f) { this.finalizadoEm = f; }
}
