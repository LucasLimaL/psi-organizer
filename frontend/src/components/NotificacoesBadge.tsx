import { useState } from 'react'
import {
  Badge, Box, Divider, IconButton, List, ListItem, ListItemButton, ListItemText,
  Popover, Tooltip, Typography,
} from '@mui/material'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { useNavigate } from 'react-router-dom'
import { parseCancelamento, type Notificacao } from '../api/notificacoes'
import { useNotificacoesPolling } from '../hooks/useNotificacoesPolling'

function descricao(n: Notificacao): string {
  if (n.tipo === 'CANCELAMENTO_PELA_PACIENTE') {
    const p = parseCancelamento(n)
    if (!p) return 'Paciente cancelou consulta'
    const dt = new Date(p.inicio)
    return `${p.pacienteNome} cancelou consulta de ${dt.toLocaleString('pt-BR')}`
  }
  return n.tipo
}

export default function NotificacoesBadge() {
  const navigate = useNavigate()
  const { envelope, marcarLida } = useNotificacoesPolling()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const aberto = Boolean(anchor)

  const naoLidas = envelope?.naoLidas ?? 0
  const itens = envelope?.notificacoes ?? []

  async function clicar(n: Notificacao) {
    await marcarLida(n.id)
    const p = parseCancelamento(n)
    if (p) navigate('/agenda')
    setAnchor(null)
  }

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton color="inherit" onClick={e => setAnchor(e.currentTarget)} aria-label="Notificações">
          <Badge badgeContent={naoLidas} color="error" overlap="circular">
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={aberto}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480 } } }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Notificações
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {naoLidas === 0 ? 'Nenhuma não lida' : `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Divider />
        {itens.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Tudo em dia — sem novidades por aqui.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {itens.map(n => (
              <ListItem key={n.id} disablePadding divider>
                <ListItemButton onClick={() => void clicar(n)}>
                  <ListItemText
                    primary={descricao(n)}
                    secondary={new Date(n.criadaEm).toLocaleString('pt-BR')}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </>
  )
}
