import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

export default function ProtectedRoute() {
  const { psicologa, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return null
  if (!psicologa) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
