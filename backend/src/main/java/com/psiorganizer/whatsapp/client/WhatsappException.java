package com.psiorganizer.whatsapp.client;

public class WhatsappException extends RuntimeException {

    private final String codigo;
    private final boolean transitorio;

    public WhatsappException(String codigo, String descricao, boolean transitorio) {
        super(descricao);
        this.codigo = codigo;
        this.transitorio = transitorio;
    }

    public String getCodigo() { return codigo; }
    public boolean isTransitorio() { return transitorio; }
}
