import { useEffect, useState } from 'react'
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, useMediaQuery, useTheme, Divider, Avatar,
  Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PaidIcon from '@mui/icons-material/PaidOutlined'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import CardMembershipIcon from '@mui/icons-material/CardMembershipOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import SpaIcon from '@mui/icons-material/Spa'
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { globalTokens } from '../theme/tokens'
import { iniciais } from '../utils/formatadores'
import PaletteSwitcher from './PaletteSwitcher'
import NotificacoesBadge from './NotificacoesBadge'
import { iniciarTour, marcarTourVisto, tourJaVisto } from '../tour/tour'

const NAV = [
  { to: '/', label: 'Início', icon: <DashboardIcon /> },
  { to: '/agenda', label: 'Agenda', icon: <EventNoteIcon /> },
  { to: '/pacientes', label: 'Pacientes', icon: <PeopleAltIcon /> },
  { to: '/financeiro', label: 'Financeiro', icon: <PaidIcon /> },
  { to: '/assinatura', label: 'Assinatura', icon: <CardMembershipIcon /> },
  { to: '/perfil', label: 'Perfil', icon: <PersonOutlineIcon /> },
  { to: '/configuracoes/whatsapp', label: 'WhatsApp', icon: <SettingsIcon /> },
]

// Conta admin é exclusiva de gestão — telas clínicas ficam fora do menu
const NAV_ADMIN = [
  { to: '/admin', label: 'Admin', icon: <AdminPanelSettingsIcon /> },
  { to: '/perfil', label: 'Perfil', icon: <PersonOutlineIcon /> },
]

// Conta restrita por inadimplência — só Assinatura, pra regularizar
const NAV_RESTRITO = [
  { to: '/assinatura', label: 'Assinatura', icon: <CardMembershipIcon /> },
]

const { drawerWidth, appBarHeight } = globalTokens.layout

function tituloDaRota(pathname: string): string {
  if (pathname.startsWith('/agenda')) return 'Agenda'
  if (pathname.startsWith('/pacientes')) return 'Pacientes'
  if (pathname.startsWith('/financeiro')) return 'Financeiro'
  if (pathname.startsWith('/admin')) return 'Admin'
  if (pathname.startsWith('/assinatura')) return 'Assinatura'
  if (pathname.startsWith('/perfil')) return 'Perfil'
  if (pathname.startsWith('/configuracoes/whatsapp')) return 'WhatsApp'
  return 'Início'
}

export default function AppShell() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { psicologa, logout } = useAuth()
  const restrito = psicologa?.restrito ?? false
  const navItems = psicologa?.admin ? NAV_ADMIN : restrito ? NAV_RESTRITO : NAV

  // Primeiro acesso: inicia o tour uma única vez por usuário (psicólogos —
  // o admin tem menu próprio, fora do roteiro). Pode ser revisto no #botao-tour.
  // A flag é marcada já no início: refresh no meio do tour não o reapresenta.
  useEffect(() => {
    if (!psicologa || psicologa.admin || restrito || tourJaVisto(psicologa.id)) return
    const id = psicologa.id
    const t = setTimeout(() => {
      marcarTourVisto(id)
      iniciarTour()
    }, 900)
    return () => clearTimeout(t)
  }, [psicologa, restrito])

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function fecharMobile() {
    if (!isDesktop) setMobileOpen(false)
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 36, height: 36, borderRadius: 2,
            bgcolor: 'primary.main', color: 'primary.contrastText',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SpaIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            psi-organizer
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Consultório
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ flexGrow: 1, px: 1.5, py: 2 }} component="nav" aria-label="Navegação principal">
        {navItems.map(item => {
          const ativo = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              onClick={fecharMobile}
              selected={ativo}
              aria-current={ativo ? 'page' : undefined}
              sx={{
                borderRadius: 2, mb: 0.5,
                '&:hover': { bgcolor: 'surfaceContainer.high' },
                '&.Mui-selected': {
                  bgcolor: 'primary.main', color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { bgcolor: 'primary.main', filter: 'brightness(1.08)' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontWeight: ativo ? 600 : 500 } } }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          {psicologa ? iniciais(psicologa.nomeCompleto) : '?'}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {psicologa?.nomeCompleto ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {psicologa?.email ?? ''}
          </Typography>
        </Box>
        <Tooltip title="Sair">
          <IconButton onClick={onLogout} aria-label="Sair" size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          height: appBarHeight,
        }}
      >
        <Toolbar sx={{ minHeight: `${appBarHeight}px !important` }}>
          <IconButton
            id="botao-abrir-menu"
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(o => !o)}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {tituloDaRota(location.pathname)}
          </Typography>
          {!psicologa?.admin && !restrito && (
            <Tooltip title="Tour do sistema">
              <IconButton
                id="botao-tour"
                color="inherit"
                aria-label="Rever o tour do sistema"
                onClick={() => iniciarTour()}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          )}
          {!restrito && (
            <Box id="sino-notificacoes" sx={{ display: 'inline-flex' }}>
              <NotificacoesBadge />
            </Box>
          )}
          <PaletteSwitcher />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="Menu lateral"
      >
        {/* Mobile — temporary drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop — permanent drawer */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: `${appBarHeight}px`,
        }}
      >
        <Box sx={{
          maxWidth: globalTokens.layout.contentMaxWidth,
          mx: 'auto',
          p: { xs: 2, md: 3 },
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
