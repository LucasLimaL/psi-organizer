package com.psiorganizer.whatsapp.client;

import java.util.List;

/**
 * Cliente do canal WhatsApp. Abstrai Meta Cloud API.
 *
 * Duas implementações:
 *   - MetaWhatsappClient (PR B): RestClient real contra graph.facebook.com
 *   - MockWhatsappClient (PR A): loga e retorna id falso. Ativada em todos os profiles
 *     != prod até MetaWhatsappClient existir.
 */
public interface WhatsappClient {

    /**
     * Envia mensagem usando template HSM aprovado pela Meta (categoria UTILITY).
     * Inicia conversa fora da service window — único caminho pago.
     */
    EnvioResultado enviarTemplate(String paraE164, String templateName, List<String> parametros);

    /**
     * Envia texto livre + botões interativos. Só funciona dentro da customer service
     * window de 24h aberta pela resposta da paciente. Grátis nessa janela.
     */
    EnvioResultado enviarTextoLivreComBotoes(String paraE164, String texto, List<Botao> botoes);

    /**
     * Envia texto livre puro. Mesma restrição da service window.
     */
    EnvioResultado enviarTextoLivre(String paraE164, String texto);
}
