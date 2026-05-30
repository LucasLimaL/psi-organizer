package com.psiorganizer.whatsapp.client;

import java.util.List;

/**
 * Cliente do canal WhatsApp. Abstrai Meta Cloud API.
 *
 * Duas implementações alternadas via property psi.whatsapp.mock:
 *   - MockWhatsappClient  (default, mock=true)
 *   - MetaWhatsappClient  (mock=false)
 */
public interface WhatsappClient {

    /**
     * Envia mensagem usando template HSM aprovado pela Meta.
     * Único caminho válido pra iniciar conversa fora da customer service window.
     *
     * @param paraE164       destinatário em E.164 (`+5511987654321`)
     * @param templateName   nome do template aprovado (ex: `hello_world`, `lembrete_consulta_v1`)
     * @param languageCode   código BCP-47 (`en_US`, `pt_BR`)
     * @param parametros     valores das variáveis `{{1}}`, `{{2}}` ... na ordem
     */
    EnvioResultado enviarTemplate(
            String paraE164, String templateName, String languageCode, List<String> parametros);

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
