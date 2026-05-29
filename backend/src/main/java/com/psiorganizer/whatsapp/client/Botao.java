package com.psiorganizer.whatsapp.client;

/**
 * Botão interativo enviado em Msg 2 / Msg 3 dentro da customer service window.
 * id é referência interna usada pra correlacionar a resposta da paciente
 * com a próxima transição da máquina de estados.
 */
public record Botao(String id, String titulo) {}
