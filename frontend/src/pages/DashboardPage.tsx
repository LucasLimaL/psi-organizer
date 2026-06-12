import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack, Box, Typography, Button, Skeleton, Tooltip, IconButton,
} from '@mui/material'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AddIcon from '@mui/icons-material/Add'
import TuneIcon from '@mui/icons-material/Tune'
import { dashboardApi, type DashboardData } from '../api/dashboard'
import { useAuth } from '../auth/authContext'
import DashboardGrid from '../dashboard/DashboardGrid'
import WidgetSettings from '../dashboard/WidgetSettings'
import { WIDGETS } from '../dashboard/widgets'
import { PREF_STORAGE_KEY, type DashboardPreferencias, type WidgetId } from '../dashboard/types'

function saudacao(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataLonga(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function carregarPreferencias(): DashboardPreferencias {
  const padrao: DashboardPreferencias = {
    ativos: WIDGETS.filter(w => w.defaultAtivo).map(w => w.id),
    ordem: WIDGETS.filter(w => w.defaultAtivo).map(w => w.id),
  }
  try {
    const raw = localStorage.getItem(PREF_STORAGE_KEY)
    if (!raw) return padrao
    const parsed = JSON.parse(raw) as DashboardPreferencias
    // Higieniza: remove widgets que não existem mais; adiciona novos defaultAtivos
    const idsValidos = new Set(WIDGETS.map(w => w.id))
    const ativos = parsed.ativos.filter(id => idsValidos.has(id))
    const ordem = parsed.ordem.filter(id => ativos.includes(id))
    // Widget novo no catálogo (não estava nos "conhecidos") entra se for default.
    // Prefs antigas não têm `conhecidos` — assume ativos ∪ ordem salvos.
    const conhecidos = new Set(parsed.conhecidos ?? [...parsed.ativos, ...parsed.ordem])
    for (const w of WIDGETS) {
      if (w.defaultAtivo && !conhecidos.has(w.id) && !ativos.includes(w.id)) {
        ativos.push(w.id)
      }
    }
    // Garante que ativos sem posição venham ao fim
    for (const id of ativos) {
      if (!ordem.includes(id)) ordem.push(id)
    }
    return { ativos, ordem }
  } catch {
    return padrao
  }
}

function salvarPreferencias(prefs: DashboardPreferencias) {
  // Registra o catálogo inteiro como visto — widget futuro será detectado como novo
  const conhecidos = WIDGETS.map(w => w.id)
  localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify({ ...prefs, conhecidos }))
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { psicologa } = useAuth()
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [prefs, setPrefs] = useState<DashboardPreferencias>(() => carregarPreferencias())
  const [settingsAberto, setSettingsAberto] = useState(false)

  const carregar = useCallback(async () => {
    const d = await dashboardApi.get()
    setDados(d)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    salvarPreferencias(prefs)
  }, [prefs])

  function onReorder(novaOrdem: WidgetId[]) {
    setPrefs(p => ({ ...p, ordem: novaOrdem }))
  }

  function onToggleWidget(id: WidgetId) {
    setPrefs(p => {
      const ativos = p.ativos.includes(id)
        ? p.ativos.filter(x => x !== id)
        : [...p.ativos, id]
      const ordem = p.ordem.includes(id)
        ? p.ordem.filter(x => ativos.includes(x))
        : [...p.ordem, id]
      return { ativos, ordem }
    })
  }

  function onResetar() {
    const padrao: DashboardPreferencias = {
      ativos: WIDGETS.filter(w => w.defaultAtivo).map(w => w.id),
      ordem: WIDGETS.filter(w => w.defaultAtivo).map(w => w.id),
    }
    setPrefs(padrao)
  }

  const primeiroNome = useMemo(
    () => psicologa?.nomeCompleto.split(' ')[0] ?? '',
    [psicologa],
  )

  return (
    <Stack spacing={3}>
      {/* Header com saudação */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {dataLonga()}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {saudacao()}, {primeiroNome || 'Dr(a).'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Configurar widgets">
            <IconButton
              onClick={() => setSettingsAberto(true)}
              sx={{ borderRadius: 2, border: theme => `1px solid ${theme.palette.divider}` }}
              aria-label="Configurar widgets"
            >
              <TuneIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<EventNoteIcon />}
            onClick={() => navigate('/agenda')}
            sx={{ borderRadius: 999 }}
          >
            Agenda
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pacientes')}
            sx={{ borderRadius: 999 }}
          >
            Novo paciente
          </Button>
        </Stack>
      </Stack>

      {/* Grid de widgets */}
      {!dados ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}>
          {Array.from({ length: prefs.ordem.length || 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} />
          ))}
        </Box>
      ) : prefs.ordem.length === 0 ? (
        <Box sx={{
          p: 4, textAlign: 'center',
          border: theme => `1px dashed ${theme.palette.divider}`,
          borderRadius: 3,
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nenhum widget selecionado.
          </Typography>
          <Button variant="contained" startIcon={<TuneIcon />} onClick={() => setSettingsAberto(true)}>
            Escolher widgets
          </Button>
        </Box>
      ) : (
        <DashboardGrid dados={dados} ordem={prefs.ordem} onReorder={onReorder} />
      )}

      <WidgetSettings
        aberto={settingsAberto}
        ativos={prefs.ativos}
        onFechar={() => setSettingsAberto(false)}
        onToggle={onToggleWidget}
        onResetar={onResetar}
      />
    </Stack>
  )
}
