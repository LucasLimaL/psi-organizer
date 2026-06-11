// Formatadores de exibição compartilhados. Formatadores de data/hora vivem em ./datas;
// normalização de telefone em ./telefones.

export function formatarCpf(cpf: string): string {
  if (cpf.length !== 11) return cpf
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

/** Duas primeiras iniciais do nome, pra Avatar. */
export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
