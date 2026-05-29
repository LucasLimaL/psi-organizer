import {
  Grid, TextField, InputAdornment, CircularProgress,
} from '@mui/material'
import { useAutofillCep } from '../hooks/useAutofillCep'

/**
 * Estrutura de endereço aceita pelo formulário. `complemento` é opcional
 * pra acomodar tipos de domínio que o tornam opcional (ex: PacienteInput).
 */
export type EnderecoFormValor = {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

type Props = {
  value: EnderecoFormValor
  onChange: (novo: EnderecoFormValor) => void
  /** Espaçamento entre campos do Grid. Default 2. */
  spacing?: number
}

/**
 * Formulário responsivo de endereço com autofill via ViaCEP.
 *
 * Comportamento:
 * - CEP, número e complemento sempre editáveis.
 * - Logradouro, bairro, cidade, UF travam após autofill bem-sucedido
 *   (e destravam quando o CEP muda ou o ViaCEP falha).
 * - CircularProgress no campo CEP enquanto a busca está em andamento.
 *
 * Compartilhado entre SignupPage (endereço da psicóloga) e PacienteForm
 * (endereço do paciente). Quando PerfilPage ganhar edição, reutiliza.
 */
export default function EnderecoForm({ value, onChange, spacing = 2 }: Props) {
  const { buscando, autoPreenchido } = useAutofillCep(value.cep, end => {
    onChange({
      ...value,
      logradouro: end.logradouro || value.logradouro,
      bairro: end.bairro || value.bairro,
      cidade: end.cidade || value.cidade,
      uf: end.uf || value.uf,
    })
  })

  function set<K extends keyof EnderecoFormValor>(k: K, v: string) {
    onChange({ ...value, [k]: v })
  }

  return (
    <Grid container spacing={spacing}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth label="CEP" required
          autoComplete="postal-code"
          helperText="Preenche endereço automaticamente"
          value={value.cep}
          onChange={e => set('cep', e.target.value)}
          slotProps={{
            input: {
              endAdornment: buscando ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} aria-label="Buscando CEP" />
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth label="Logradouro" required
          autoComplete="address-line1"
          disabled={autoPreenchido}
          value={value.logradouro}
          onChange={e => set('logradouro', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          fullWidth label="Número" required
          value={value.numero}
          onChange={e => set('numero', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth label="Complemento"
          autoComplete="address-line2"
          value={value.complemento ?? ''}
          onChange={e => set('complemento', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth label="Bairro" required
          disabled={autoPreenchido}
          value={value.bairro}
          onChange={e => set('bairro', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField
          fullWidth label="Cidade" required
          autoComplete="address-level2"
          disabled={autoPreenchido}
          value={value.cidade}
          onChange={e => set('cidade', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth label="UF" required
          autoComplete="address-level1"
          disabled={autoPreenchido}
          slotProps={{ htmlInput: { maxLength: 2 } }}
          value={value.uf}
          onChange={e => set('uf', e.target.value.toUpperCase())}
        />
      </Grid>
    </Grid>
  )
}
