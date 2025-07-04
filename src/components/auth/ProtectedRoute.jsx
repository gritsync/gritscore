import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export const ProtectedRoute = ({ children, vipOnly = false }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-grit-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (vipOnly) {
    // Accept plan from user.subscription_plan, user.plan, or user.role
    const plan = user.subscription_plan || user.plan || user.role || ''
    if (plan !== 'vip' && plan !== 'premium') {
      return <Navigate to="/upgrade" state={{ from: location }} replace />
    }
  }

  return children
} 