import {
  Drawer, Box, Typography, Stack, Switch, FormControlLabel, IconButton, Divider, Button,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { WIDGETS } from './widgets'
import type { WidgetId } from './types'

type Props = {
  aberto: boolean
  ativos: WidgetId[]
  onFechar: () => void
  onToggle: (id: WidgetId) => void
  onResetar: () => void
}

export default function WidgetSettings({ aberto, ativos, onFechar, onToggle, onResetar }: Props) {
  const ativosSet = new Set(ativos)
  return (
    <Drawer
      anchor="right"
      open={aberto}
      onClose={onFechar}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 360 } } } }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" sx={{ alignItems: 'center', p: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Widgets</Typography>
            <Typography variant="caption" color="text.secondary">
              Escolha o que aparece no início e arraste para reordenar
            </Typography>
          </Box>
          <IconButton onClick={onFechar} aria-label="Fechar configurações">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <Stack spacing={1}>
            {WIDGETS.map(w => (
              <FormControlLabel
                key={w.id}
                control={
                  <Switch
                    checked={ativosSet.has(w.id)}
                    onChange={() => onToggle(w.id)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {w.titulo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {w.descricao}
                    </Typography>
                  </Box>
                }
                sx={{
                  alignItems: 'flex-start',
                  ml: 0, mr: 0,
                  '& .MuiFormControlLabel-label': { ml: 1, mt: 0.5 },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            startIcon={<RestartAltIcon />}
            onClick={onResetar}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Restaurar padrão
          </Button>
        </Box>
      </Stack>
    </Drawer>
  )
}
