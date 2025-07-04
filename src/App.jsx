import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CreditAnalysis from './pages/CreditAnalysis'
import AIChat from './pages/AIChat'
import Budgeting from './pages/Budgeting'
import Disputes from './pages/Disputes'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import Pricing from './pages/Pricing'
import VerifyEmail from './pages/VerifyEmail'
import DebtTracker from './pages/DebtTracker'
import CreditSimulator from './pages/CreditSimulator'
import AnalysisResult from './pages/AnalysisResult'
import PaymentSuccess from './pages/PaymentSuccess'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            
            {/* Protected routes */}
            <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="analysis" element={<CreditAnalysis />} />
              <Route path="analysis-result/:id" element={<AnalysisResult />} />
              <Route path="chat" element={<AIChat />} />
              <Route path="budgeting" element={<Budgeting />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="debt-tracker" element={<DebtTracker />} />
              <Route path="profile" element={<Profile />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="simulator" element={<CreditSimulator />} />
            </Route>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App 