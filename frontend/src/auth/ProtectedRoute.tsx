import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

export default function ProtectedRoute() {
  const { psicologa, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return null
  if (!psicologa) return <Navigate to="/login" replace state={{ from: location }} />
  // Sessão restrita por inadimplência: só a tela de Assinatura é acessível —
  // qualquer outra rota (inclusive navegação direta por URL) cai pra lá. O backend
  // reforça o mesmo bloqueio via 403 (claim do JWT). Ver docs/BUSINESS_RULES.md §11.
  if (psicologa.restrito && location.pathname !== '/assinatura') {
    return <Navigate to="/assinatura" replace />
  }
  return <Outlet />
}
