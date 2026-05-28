import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AgendaPage from './pages/AgendaPage'
import PacientesPage from './pages/PacientesPage'
import PacienteDetalhePage from './pages/PacienteDetalhePage'
import PerfilPage from './pages/PerfilPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<AgendaPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id" element={<PacienteDetalhePage />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
