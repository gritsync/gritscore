import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { CheckCircleIcon, ExclamationTriangleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

const apiUrl = import.meta.env.VITE_API_URL;

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState('loading') // loading, success, error, expired
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)

  const uid = searchParams.get('uid')

  useEffect(() => {
    if (uid) {
      verifyEmail(uid)
    } else {
      setStatus('error')
    }
  }, [uid])

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        // Automatically log the user in
        login(data.token, data.user)
        toast.success('Email verified successfully! Welcome to GritScore.ai!')
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/app')
        }, 2000)
      } else {
        if (data.message.includes('expired')) {
          setStatus('expired')
        } else {
          setStatus('error')
        }
        toast.error(data.message || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      toast.error('Verification failed. Please try again.')
    }
  }

  const resendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setIsResending(true)
    try {
      const response = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Verification email sent successfully!')
      } else {
        toast.error(data.message || 'Failed to resend verification email')
      }
    } catch (error) {
      console.error('Resend error:', error)
      toast.error('Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grit-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we verify your account.</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been successfully verified. You're being redirected to your dashboard...
            </p>
            <div className="animate-pulse">
              <div className="bg-grit-100 text-grit-700 px-4 py-2 rounded-lg inline-block">
                Redirecting to dashboard...
              </div>
            </div>
          </div>
        )

      case 'expired':
        return (
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Link Expired</h2>
            <p className="text-gray-600 mb-6">
              The verification link has expired. Please request a new verification email.
            </p>
            <div className="max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-grit-500 focus:border-transparent"
              />
              <button
                onClick={resendVerification}
                disabled={isResending}
                className="w-full bg-grit-600 text-white py-2 px-4 rounded-lg hover:bg-grit-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">
              There was an error verifying your email. The link may be invalid or expired.
            </p>
            <div className="max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-grit-500 focus:border-transparent"
              />
              <button
                onClick={resendVerification}
                disabled={isResending}
                className="w-full bg-grit-600 text-white py-2 px-4 rounded-lg hover:bg-grit-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-grit-50 via-white to-grit-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/gritscore.png" alt="GritScore.ai" className="h-16 w-auto mx-auto" />
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Having trouble?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-grit-600 hover:text-grit-700 font-medium"
            >
              Contact support
            </button>
          </p>
        </div>
      </div>
    </div>
  )
} 