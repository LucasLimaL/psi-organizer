import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material'
import { useAuth } from '../auth/authContext'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { psicologa, logout } = useAuth()
  const isActive = (path: string) => location.pathname === path

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>psi-organizer</Typography>
          <Button color="inherit" component={RouterLink} to="/"
                  sx={{ fontWeight: isActive('/') ? 700 : 400 }}>Agenda</Button>
          <Button color="inherit" component={RouterLink} to="/pacientes"
                  sx={{ fontWeight: isActive('/pacientes') ? 700 : 400 }}>Pacientes</Button>
          <Button color="inherit" component={RouterLink} to="/perfil"
                  sx={{ fontWeight: isActive('/perfil') ? 700 : 400 }}>Perfil</Button>
          {psicologa && (
            <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{psicologa.nomeCompleto}</Typography>
              <Button color="inherit" variant="outlined" size="small" onClick={onLogout}>Sair</Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
