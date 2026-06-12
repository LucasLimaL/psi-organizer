import type { Contrato, Fatura } from '../api/admin'

/** Helpers compartilhados entre o detalhe do admin e a aba Assinatura. */

export function dataLocal(iso: string): string {
  return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('pt-BR')
}

export function dataHoraLocal(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** Competência da fatura = mês do fechamento. Ex.: fecha 25/03/2026 → "Março 2026". */
export function competencia(periodoFim: string): string {
  const d = new Date(periodoFim + 'T00:00:00')
  const mes = d.toLocaleDateString('pt-BR', { month: 'long' })
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${d.getFullYear()}`
}

/** Data local de hoje em YYYY-MM-DD (não UTC — toISOString vira "amanhã" após 21h BRT). */
export function hojeLocalISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function situacaoContrato(c: Contrato): 'Vigente' | 'Agendado' | 'Encerrado' {
  const hoje = hojeLocalISO()
  if (c.dataInicio > hoje) return 'Agendado'
  if (c.dataFim !== null && c.dataFim < hoje) return 'Encerrado'
  return 'Vigente'
}

export function vigencia(c: Contrato): string {
  return `${dataLocal(c.dataInicio)} → ${c.dataFim ? dataLocal(c.dataFim) : 'indeterminado'}`
}

export const CHIP_STATUS: Record<Fatura['status'], { rotulo: string; cor: 'success' | 'error' | 'info' }> = {
  PAGA: { rotulo: 'Paga', cor: 'success' },
  VENCIDA: { rotulo: 'Vencida', cor: 'error' },
  A_VENCER: { rotulo: 'A vencer', cor: 'info' },
}
