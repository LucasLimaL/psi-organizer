package com.psiorganizer.whatsapp.client;

public class WhatsappException extends RuntimeException {

    private final String codigo;
    private final boolean transitorio;
    private final String responseBody;

    public WhatsappException(String codigo, String descricao, boolean transitorio) {
        this(codigo, descricao, transitorio, null);
    }

    /**
     * Body bruto da resposta Meta (ou null se não houver). Incluído pra debug —
     * o completion log do flow caller é quem decide se loga ou descarta.
     */
    public WhatsappException(String codigo, String descricao, boolean transitorio,
                             String responseBody) {
        super(descricao);
        this.codigo = codigo;
        this.transitorio = transitorio;
        this.responseBody = responseBody;
    }

    public String getCodigo() { return codigo; }
    public boolean isTransitorio() { return transitorio; }
    public String getResponseBody() { return responseBody; }
}
