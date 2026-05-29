/**
 * Cliente para consulta de CEP. Usa ViaCEP (https://viacep.com.br),
 * gratuito, sem autenticação, sem rate limit prático.
 */

export type EnderecoCep = {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

type ViaCepResposta = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean | string
}

export async function buscarCep(cepBruto: string): Promise<EnderecoCep | null> {
  const cep = cepBruto.replace(/\D/g, '')
  if (cep.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    if (!res.ok) return null
    const data = (await res.json()) as ViaCepResposta
    if (data.erro) return null
    return {
      cep: data.cep?.replace(/\D/g, '') ?? cep,
      logradouro: data.logradouro ?? '',
      complemento: data.complemento ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      uf: data.uf ?? '',
    }
  } catch {
    return null
  }
}
