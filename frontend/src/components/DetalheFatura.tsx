import { Box, Stack, Paper, Typography, Grid, Divider } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { formatarMoeda as brl } from '../utils/formatadores'
import { dataLocal } from '../utils/faturas'

function CampoDetalhe({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{
        display: 'block', color: 'text.secondary', mb: 0.5,
        textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, fontWeight: 600,
      }}>
        {rotulo}
      </Typography>
      <Typography variant="body2" sx={{
        fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: cor ?? 'text.primary',
      }}>
        {valor}
      </Typography>
    </Box>
  )
}

/** Painel expandido da fatura: período, vencimento, pagamento e rateio por contrato. */
export default function DetalheFatura({ periodo, vencimento, pagamento, itens, valorMensalPorContrato }: {
  periodo: string
  vencimento: string
  pagamento: string | null
  itens: { contratoId: string; periodoInicio: string; periodoFim: string; dias: number; valor: number }[]
  valorMensalPorContrato: Map<string, number>
}) {
  const theme = useTheme()
  return (
    <Paper
      variant="outlined"
      sx={{
        ml: 4.5, mb: 1.5, p: { xs: 2, sm: 2.5 }, borderRadius: 2,
        boxShadow: 'none', border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
      }}
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CampoDetalhe rotulo="Período" valor={periodo} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <CampoDetalhe rotulo="Vencimento" valor={vencimento} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <CampoDetalhe
            rotulo="Pagamento"
            valor={pagamento ?? 'não pago'}
            cor={pagamento ? theme.palette.success.main : theme.palette.text.disabled}
          />
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" sx={{
        display: 'block', color: 'text.secondary', mb: 1,
        textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, fontWeight: 600,
      }}>
        Rateio por contrato
      </Typography>
      <Stack spacing={1.25}>
        {itens.map((item, idx) => {
          const valorMensal = valorMensalPorContrato.get(item.contratoId)
          const cortesia = valorMensal === 0
          return (
            <Stack key={idx} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                aria-hidden
                sx={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  bgcolor: cortesia ? theme.palette.text.disabled : theme.palette.primary.main,
                }}
              />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {valorMensal === undefined
                    ? 'Contrato'
                    : cortesia ? 'Cortesia' : `Plano ${brl(valorMensal)}/mês`}
                </Typography>
                <Typography variant="caption" color="text.secondary"
                            sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dataLocal(item.periodoInicio)} → {dataLocal(item.periodoFim)} ·{' '}
                  {item.dias} dia{item.dias === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{
                fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                {brl(item.valor)}
              </Typography>
            </Stack>
          )
        })}
      </Stack>
    </Paper>
  )
}
