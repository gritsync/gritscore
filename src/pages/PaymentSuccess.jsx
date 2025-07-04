import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { subscriptionAPI } from '../services/api'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState('processing') // processing, success, error
  const [message, setMessage] = useState('Processing your payment...')

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (canceled === 'true') {
      setStatus('error')
      setMessage('Payment was canceled. Redirecting to dashboard...')
      setTimeout(() => navigate('/app'), 3000)
      return
    }

    if (success === 'true') {
      handlePaymentSuccess()
    } else {
      setStatus('error')
      setMessage('Invalid payment status. Redirecting to dashboard...')
      setTimeout(() => navigate('/app'), 3000)
    }
  }, [searchParams, navigate])

  const handlePaymentSuccess = async () => {
    try {
      setStatus('processing')
      setMessage('Updating your subscription...')

      // Wait a moment for Stripe webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Try to manually update the plan if webhook didn't work
      try {
        const plan = searchParams.get('plan') || 'vip' // Default to VIP if no plan specified
        await subscriptionAPI.updatePlan(plan)
        console.log('Manually updated plan to:', plan)
      } catch (updateError) {
        console.log('Manual plan update failed, trying webhook:', updateError)
      }

      // Refresh user data to get updated plan
      await refreshUser()

      setStatus('success')
      setMessage('Payment successful! Your plan has been upgraded.')

      // Redirect to dashboard after showing success
      setTimeout(() => {
        navigate('/app')
      }, 3000)

    } catch (error) {
      console.error('Error updating subscription:', error)
      setStatus('error')
      setMessage('Payment successful, but there was an issue updating your plan. Please contact support.')
      
      setTimeout(() => navigate('/app'), 5000)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="w-16 h-16 text-blue-500 animate-spin flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )
      case 'success':
        return <CheckCircleIcon className="w-16 h-16 text-green-500 animate-success-pulse" />
      case 'error':
        return <ExclamationTriangleIcon className="w-16 h-16 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-bounce-in relative">
        {/* Animated Icon */}
        <div className="flex justify-center mb-6 animate-fade-in-up">
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {status === 'processing' && 'Processing Payment...'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'error' && 'Payment Issue'}
        </h1>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Progress Bar for Processing */}
        {status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}

        {/* Success Details */}
        {status === 'success' && (
          <>
            {/* Confetti Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`blue-${i}`}
                  className="absolute w-2 h-2 bg-blue-400 animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
              {[...Array(10)].map((_, i) => (
                <div
                  key={`green-${i}`}
                  className="absolute w-2 h-2 bg-green-400 animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 animate-fade-in-up">
              <h3 className="font-semibold text-green-800 mb-2">Welcome to Premium!</h3>
              <p className="text-sm text-green-700">
                You now have access to all premium features including advanced credit analysis, 
                dispute generation, and personalized recommendations.
              </p>
            </div>
          </>
        )}

        {/* Error Details */}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Something went wrong</h3>
            <p className="text-sm text-red-700">
              Don't worry, your payment was processed. If you don't see your plan updated, 
              please contact our support team.
            </p>
          </div>
        )}

        {/* Redirect Message */}
        <p className="text-sm text-gray-500">
          Redirecting to dashboard in a few seconds...
        </p>

        {/* Manual Redirect Button */}
        <button
          onClick={() => navigate('/app')}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Go to Dashboard Now
        </button>
      </div>
    </div>
  )
}

export default PaymentSuccess 