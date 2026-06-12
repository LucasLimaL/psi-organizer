import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import AgendaPage from './pages/AgendaPage'
import PacientesPage from './pages/PacientesPage'
import PacienteDetalhePage from './pages/PacienteDetalhePage'
import FinanceiroPage from './pages/FinanceiroPage'
import AdminPage from './pages/AdminPage'
import AdminPsicologoDetalhePage from './pages/AdminPsicologoDetalhePage'
import PerfilPage from './pages/PerfilPage'
import ConfiguracoesWhatsappPage from './pages/ConfiguracoesWhatsappPage'
import HistoricoWhatsappPage from './pages/HistoricoWhatsappPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id" element={<PacienteDetalhePage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/psicologos/:id" element={<AdminPsicologoDetalhePage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/configuracoes/whatsapp" element={<ConfiguracoesWhatsappPage />} />
          <Route path="/configuracoes/whatsapp/historico" element={<HistoricoWhatsappPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
