import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { SparklesIcon, EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { loadStripe } from '@stripe/stripe-js'
import { subscriptionAPI } from '../services/api'

const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', regex: /.{8,}/ },
  { id: 'uppercase', label: 'One uppercase letter', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'One lowercase letter', regex: /[a-z]/ },
  { id: 'number', label: 'One number', regex: /\d/ },
  { id: 'special', label: 'One special character', regex: /[!@#$%^&*(),.?":{}|<>]/ },
]

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const plan = searchParams.get('plan')?.toLowerCase()
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripePromise = loadStripe(stripeKey);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password', '')
  const confirmPassword = watch('confirmPassword', '')

  const getPasswordStrength = (password) => {
    const requirements = passwordRequirements.map(req => req.regex.test(password))
    const met = requirements.filter(Boolean).length
    if (met <= 2) return { strength: 'weak', color: 'red', percentage: (met / 5) * 100 }
    if (met <= 4) return { strength: 'medium', color: 'yellow', percentage: (met / 5) * 100 }
    return { strength: 'strong', color: 'green', percentage: (met / 5) * 100 }
  }

  const passwordStrength = getPasswordStrength(password)

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const result = await registerUser({
        first_name: data.first_name,
        middle_name: data.middle_name || '',
        last_name: data.last_name,
        email: data.email,
        password: data.password,
      })
      
      if (result.success) {
        // If a paid plan is in the query params, trigger Stripe Checkout
        if (plan && ['basic', 'premium', 'vip'].includes(plan)) {
          setLoadingCheckout(true)
          try {
            const res = await subscriptionAPI.createCheckoutSession(plan)
            const sessionId = res.data.id
            const stripe = await stripePromise
            await stripe.redirectToCheckout({ sessionId })
            return // Don't navigate to dashboard
          } catch (e) {
            toast.error('Failed to start checkout')
          } finally {
            setLoadingCheckout(false)
          }
        }
        toast.success('Account created successfully! Redirecting to dashboard...')
        navigate('/app')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-grit-50 via-white to-grit-100 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="flex justify-center">
            <img src="/gritscore.png" alt="GritScore.ai" className="h-20 w-auto" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-grit-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start your journey to better credit with AI-powered insights
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  {...register('first_name', {
                    required: 'First name is required',
                    minLength: {
                      value: 2,
                      message: 'First name must be at least 2 characters'
                    }
                  })}
                  className={`input-field ${errors.first_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="First name"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Middle name
                </label>
                <input
                  id="middle_name"
                  type="text"
                  autoComplete="additional-name"
                  {...register('middle_name')}
                  className="input-field"
                  placeholder="Middle name (optional)"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  {...register('last_name', {
                    required: 'Last name is required',
                    minLength: {
                      value: 2,
                      message: 'Last name must be at least 2 characters'
                    }
                  })}
                  className={`input-field ${errors.last_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Last name"
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className={`input-field ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  className={`input-field pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.strength === 'weak' ? 'text-red-600' :
                      passwordStrength.strength === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.strength}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.strength === 'weak' ? 'bg-red-500' :
                        passwordStrength.strength === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                  
                  {/* Password requirements */}
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req) => (
                      <div key={req.id} className="flex items-center text-xs">
                        {req.regex.test(password) ? (
                          <CheckIcon className="w-3 h-3 text-green-500 mr-2" />
                        ) : (
                          <div className="w-3 h-3 border border-gray-300 rounded-full mr-2" />
                        )}
                        <span className={req.regex.test(password) ? 'text-green-600' : 'text-gray-500'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              {...register('terms', {
                required: 'You must accept the terms and conditions'
              })}
              className="h-4 w-4 text-grit-600 focus:ring-grit-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <a href="#" className="font-medium text-grit-600 hover:text-grit-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-grit-600 hover:text-grit-500">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="text-sm text-red-600">{errors.terms.message}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || loadingCheckout}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-grit-600 hover:bg-grit-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-grit-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {(isLoading || loadingCheckout) ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-grit-600 hover:text-grit-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>

        {/* Email Verification Message */}
        {false && (
          <motion.div></motion.div>
        )}
      </motion.div>
    </div>
  )
} 