import { api } from './client'

export type ConfiguracaoWhatsapp = {
  ativo: boolean
  templateMensagem: string
  /** Formato HH:00, hora cheia entre 07:00 e 20:00. */
  horarioEnvioLembrete: string
  atualizadoEm: string
}

export type AtualizarConfiguracaoWhatsappInput = {
  ativo: boolean
  templateMensagem: string
  horarioEnvioLembrete: string
}

export type EnviarTesteResposta = {
  mensagemIdExterna: string
}

export const whatsappApi = {
  obter: () => api<ConfiguracaoWhatsapp>('/me/whatsapp'),
  atualizar: (input: AtualizarConfiguracaoWhatsappInput) =>
    api<ConfiguracaoWhatsapp>('/me/whatsapp', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  enviarTeste: (telefoneE164: string) =>
    api<EnviarTesteResposta>('/me/whatsapp/teste', {
      method: 'POST',
      body: JSON.stringify({ telefoneE164 }),
    }),
}

/** Horas cheias permitidas no Select. */
export const HORARIOS_VALIDOS = Array.from({ length: 14 }, (_, i) => {
  const h = (i + 7).toString().padStart(2, '0')
  return `${h}:00`
})

/** Renderiza o template substituindo placeholders por valores. */
export function renderizarTemplate(
  template: string,
  valores: { paciente: string; psicologa: string; data: string; hora: string },
): string {
  return template
    .replace(/\{paciente\}/g, valores.paciente)
    .replace(/\{psicologa\}/g, valores.psicologa)
    .replace(/\{data\}/g, valores.data)
    .replace(/\{hora\}/g, valores.hora)
}
