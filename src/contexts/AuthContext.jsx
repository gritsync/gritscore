import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token)
        console.log('=== AUTH CONTEXT DEBUG ===')
        console.log('Decoded token:', decoded)
        console.log('Token has exp:', 'exp' in decoded)
        
        // Check if token has expiration
        if ('exp' in decoded) {
          const currentTime = Date.now() / 1000
          if (decoded.exp > currentTime) {
            setUser(decoded)
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          } else {
            console.log('Token expired, logging out')
            logout()
          }
        } else {
          // Token doesn't have expiration, assume it's valid
          console.log('Token has no expiration, assuming valid')
          setUser(decoded)
          // Don't set Authorization header here - let the interceptor handle it
        }
      } catch (error) {
        console.error('Token decode error:', error)
        console.log('Token that failed to decode:', token.substring(0, 50) + '...')
        logout()
      }
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token: newToken } = response.data
      console.log('=== LOGIN DEBUG ===')
      console.log('Received token:', newToken.substring(0, 50) + '...')
      
      try {
        const decoded = jwtDecode(newToken)
        console.log('Decoded token:', decoded)
        localStorage.setItem('token', newToken)
        setToken(newToken)
        setUser(decoded)
        // Don't set Authorization header here - let the interceptor handle it
        return { success: true }
      } catch (decodeError) {
        console.error('Failed to decode token:', decodeError)
        // Even if decode fails, store the token and try to use it
        localStorage.setItem('token', newToken)
        setToken(newToken)
        setUser({ email }) // Set minimal user info
        // Don't set Authorization header here - let the interceptor handle it
        return { success: true }
      }
    } catch (error) {
      console.error('Login error:', error)
      // Handle email verification error
      if (error.response?.status === 401 && error.response?.data?.email_verified === false) {
        return { 
          success: false, 
          error: error.response?.data?.message || 'Please verify your email before logging in',
          emailNotVerified: true
        }
      }
      
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { token: newToken } = response.data
      const decoded = jwtDecode(newToken)
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(decoded)
      // Don't set Authorization header here - let the interceptor handle it
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    // Don't manually delete Authorization header - let the interceptor handle it
  }

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData)
      const updatedUser = response.data.user
      setUser(updatedUser)
      return { success: true }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update profile')
    }
  }

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me')
      const updatedUser = response.data.user
      setUser(updatedUser)
      return { success: true }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      return { success: false, error: error.response?.data?.message || 'Failed to refresh user' }
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 