import { api } from './client'

export type ConfiguracaoWhatsapp = {
  ativo: boolean
  /** Prévia read-only do template aprovado na Meta — placeholders {{1}}..{{4}}. */
  templateMensagem: string
  /** Formato HH:00, hora cheia entre 07:00 e 20:00. */
  horarioEnvioLembrete: string
  atualizadoEm: string
}

export type AtualizarConfiguracaoWhatsappInput = {
  ativo: boolean
  horarioEnvioLembrete: string
}

export type EnviarTesteResposta = {
  mensagemIdExterna: string
}

export type EtapaLembrete =
  | 'AGUARDANDO_ESCOLHA'
  | 'AGUARDANDO_CONFIRMACAO_DUPLA'
  | 'FINALIZADO'
  | 'EXPIRADO'
  | 'CONGELADO_POR_LOOP'

export type StatusEntregaLembrete = 'PENDENTE' | 'ENVIADO' | 'ENTREGUE' | 'LIDO' | 'FALHOU'

export type EscolhaLembrete = 'CONFIRMAR' | 'CANCELAR'

export type LembreteResumo = {
  id: string
  consultaId: string
  pacienteNome: string
  consultaInicio?: string | null
  enviadoEm?: string | null
  statusEntrega: StatusEntregaLembrete
  etapa: EtapaLembrete
  escolhaInicial?: EscolhaLembrete | null
  escolhaFinal?: EscolhaLembrete | null
  ciclosVoltar: number
  confirmacaoDuplaTentativas: number
  erroCodigo?: string | null
  erroDescricao?: string | null
}

export type LembretesEnvelope = {
  lembretes: LembreteResumo[]
  total: number
  temMais: boolean
}

export type FiltrosHistorico = {
  etapa?: EtapaLembrete
  statusEntrega?: StatusEntregaLembrete
  inicioEm?: string  // YYYY-MM-DD em SP
  fimEm?: string
  limit?: number
  offset?: number
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
  listarHistorico: (f: FiltrosHistorico = {}) => {
    const qs = new URLSearchParams()
    if (f.etapa) qs.set('etapa', f.etapa)
    if (f.statusEntrega) qs.set('statusEntrega', f.statusEntrega)
    if (f.inicioEm) qs.set('inicioEm', f.inicioEm)
    if (f.fimEm) qs.set('fimEm', f.fimEm)
    qs.set('limit', String(f.limit ?? 50))
    qs.set('offset', String(f.offset ?? 0))
    return api<LembretesEnvelope>(`/me/whatsapp/lembretes?${qs}`)
  },
}

/** Horas cheias permitidas no Select. */
export const HORARIOS_VALIDOS = Array.from({ length: 14 }, (_, i) => {
  const h = (i + 7).toString().padStart(2, '0')
  return `${h}:00`
})

/** Renderiza o template Meta substituindo {{1}}..{{4}} pelos valores de exemplo. */
export function renderizarTemplate(
  template: string,
  valores: { paciente: string; psicologa: string; data: string; hora: string },
): string {
  return template
    .replace(/\{\{1\}\}/g, valores.paciente)
    .replace(/\{\{2\}\}/g, valores.psicologa)
    .replace(/\{\{3\}\}/g, valores.data)
    .replace(/\{\{4\}\}/g, valores.hora)
}
