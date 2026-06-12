import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Stack, Box, Paper, Typography, Chip, Skeleton, Grid, Divider, ButtonBase, Collapse,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { assinaturaApi, type Assinatura } from '../api/assinatura'
import { formatarMoeda as brl } from '../utils/formatadores'
import {
  CHIP_STATUS, competencia, dataHoraLocal, dataLocal, situacaoContrato, vigencia,
} from '../utils/faturas'
import DetalheFatura from '../components/DetalheFatura'

/**
 * Aba Assinatura — o psicólogo acompanha os PRÓPRIOS contratos e faturas.
 * Mesma visão do detalhe do admin, porém somente leitura (baixa e contratos
 * são geridos pelo administrador do sistema).
 */
export default function AssinaturaPage() {
  const theme = useTheme()
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [itensAbertos, setItensAbertos] = useState<string | null>(null)
  const [anoFiltro, setAnoFiltro] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    const a = await assinaturaApi.minha()
    setAssinatura(a)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const faturas = useMemo(() => assinatura?.faturas ?? [], [assinatura])
  const previas = useMemo(() => assinatura?.previas ?? [], [assinatura])
  const contratos = useMemo(() => assinatura?.contratos ?? [], [assinatura])

  const anos = useMemo(
    () => [...new Set(faturas.map(f => Number(f.periodoFim.slice(0, 4))))].sort((a, b) => b - a),
    [faturas],
  )

  useEffect(() => {
    if (anos.length > 0 && (anoFiltro === null || !anos.includes(anoFiltro))) {
      setAnoFiltro(anos[0])
    }
  }, [anos, anoFiltro])

  const fechadasDoAno = useMemo(
    () => faturas.filter(f => Number(f.periodoFim.slice(0, 4)) === anoFiltro),
    [faturas, anoFiltro],
  )

  const valorMensalPorContrato = useMemo(
    () => new Map(contratos.map(c => [c.id, c.valorMensal])),
    [contratos],
  )

  const contratoVigente = contratos.find(c => situacaoContrato(c) === 'Vigente') ?? null
  const vencidas = faturas.filter(f => f.status === 'VENCIDA')
  const totalVencido = vencidas.reduce((acc, f) => acc + f.valor, 0)
  const previaAtual = previas[0] ?? null

  if (!assinatura) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    )
  }

  const cardsx = { p: 2, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="body2" color="text.secondary">
          Seu plano de uso do sistema · fechamento dia {assinatura.diaFechamento}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Assinatura
        </Typography>
      </Stack>

      {/* Cards de resumo */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={cardsx}>
            <Typography variant="caption" sx={{
              color: 'text.secondary', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Plano vigente
            </Typography>
            {contratoVigente ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {contratoVigente.valorMensal === 0 ? 'Cortesia' : (
                    <>
                      {brl(contratoVigente.valorMensal)}
                      <Typography component="span" variant="body2" color="text.secondary">/mês</Typography>
                    </>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {vigencia(contratoVigente)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="error.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                sem plano vigente
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ ...cardsx, borderLeft: `3px solid ${theme.palette.error.main}` }}>
            <Typography variant="caption" sx={{
              color: 'error.main', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Vencido
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: totalVencido > 0 ? 'error.main' : 'text.primary',
            }}>
              {brl(totalVencido)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {vencidas.length} fatura{vencidas.length === 1 ? '' : 's'} vencida{vencidas.length === 1 ? '' : 's'}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ ...cardsx, borderLeft: `3px solid ${theme.palette.info.main}` }}>
            <Typography variant="caption" sx={{
              color: 'info.main', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Fatura atual
            </Typography>
            {previaAtual ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {brl(previaAtual.valor)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  fecha em {dataLocal(previaAtual.periodoFim)} · vence {dataLocal(previaAtual.vencimento)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="text.disabled" sx={{ mt: 0.5 }}>
                sem fatura em curso
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Faturas */}
      <Paper variant="outlined" sx={cardsx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Faturas
          </Typography>
          {anos.map(ano => (
            <Chip
              key={ano}
              size="small"
              label={ano}
              clickable
              color={ano === anoFiltro ? 'primary' : 'default'}
              variant={ano === anoFiltro ? 'filled' : 'outlined'}
              onClick={() => setAnoFiltro(ano)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
        {faturas.length === 0 && previas.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nenhuma fatura ainda.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {[...previas].reverse().map((p, i) => {
              const chave = `previa-${p.periodoFim}`
              const aberta = itensAbertos === chave
              const rotulo = i === previas.length - 1 ? 'Fatura atual' : 'Próxima fatura'
              return (
                <Box key={chave}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                    <ButtonBase
                      onClick={() => setItensAbertos(aberta ? null : chave)}
                      aria-expanded={aberta}
                      sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1, borderRadius: 1 }}
                    >
                      <ExpandMoreIcon sx={{
                        fontSize: 18, color: 'text.disabled',
                        transform: aberta ? 'rotate(180deg)' : 'none',
                        transition: theme.transitions.create('transform', {
                          duration: theme.transitions.duration.short,
                        }),
                      }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.8 }}>
                        {competencia(p.periodoFim)}
                      </Typography>
                    </ButtonBase>
                    <Typography variant="body2" sx={{
                      fontWeight: 600, fontVariantNumeric: 'tabular-nums', opacity: 0.8,
                    }}>
                      {brl(p.valor)}
                    </Typography>
                    <Chip size="small" label={rotulo} variant="outlined" color="info"
                          sx={{ height: 22, fontSize: 11, fontWeight: 600, borderStyle: 'dashed' }} />
                  </Stack>
                  <Collapse in={aberta}>
                    <DetalheFatura
                      periodo={`${dataLocal(p.periodoInicio)} → ${dataLocal(p.periodoFim)}`}
                      vencimento={`${dataLocal(p.vencimento)} (previsto)`}
                      pagamento={null}
                      itens={p.itens}
                      valorMensalPorContrato={valorMensalPorContrato}
                    />
                  </Collapse>
                </Box>
              )
            })}
            {fechadasDoAno.map(f => {
              const chip = CHIP_STATUS[f.status]
              const aberta = itensAbertos === f.id
              return (
                <Box key={f.id}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                    <ButtonBase
                      onClick={() => setItensAbertos(aberta ? null : f.id)}
                      aria-expanded={aberta}
                      sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1, borderRadius: 1 }}
                    >
                      <ExpandMoreIcon sx={{
                        fontSize: 18, color: 'text.disabled',
                        transform: aberta ? 'rotate(180deg)' : 'none',
                        transition: theme.transitions.create('transform', {
                          duration: theme.transitions.duration.short,
                        }),
                      }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {competencia(f.periodoFim)}
                      </Typography>
                    </ButtonBase>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {brl(f.valor)}
                    </Typography>
                    <Chip size="small" label={chip.rotulo} color={chip.cor}
                          variant={f.status === 'VENCIDA' ? 'filled' : 'outlined'}
                          sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                  </Stack>
                  <Collapse in={aberta}>
                    <DetalheFatura
                      periodo={`${dataLocal(f.periodoInicio)} → ${dataLocal(f.periodoFim)}`}
                      vencimento={dataLocal(f.vencimento)}
                      pagamento={f.paga && f.pagaEm ? dataHoraLocal(f.pagaEm) : null}
                      itens={f.itens}
                      valorMensalPorContrato={valorMensalPorContrato}
                    />
                  </Collapse>
                </Box>
              )
            })}
          </Stack>
        )}
      </Paper>

      {/* Contratos (somente leitura) */}
      <Paper variant="outlined" sx={cardsx}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Contratos
        </Typography>
        {contratos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nenhum contrato ainda.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {contratos.map(c => {
              const situacao = situacaoContrato(c)
              return (
                <Stack key={c.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                  <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {brl(c.valorMensal)}/mês
                      {c.valorMensal === 0 && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {' '}(cortesia)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {vigencia(c)}
                    </Typography>
                  </Stack>
                  <Chip size="small" label={situacao}
                        color={situacao === 'Vigente' ? 'success' : situacao === 'Agendado' ? 'info' : 'default'}
                        variant="outlined" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                </Stack>
              )
            })}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Pagamentos e mudanças de plano são registrados pelo administrador do sistema.
        </Typography>
      </Paper>
    </Stack>
  )
}
