import React from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import {loadStripe} from '@stripe/stripe-js'
import { subscriptionAPI } from '../services/api'

// Debug: Log the Stripe key being used
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51Qt9RuGl6Bh5tV23vSlevMMOTaYxUQCRE56RcKqt4jupCZnGyfQ4DwW8gvj0oZgZUTsGM0Emu6Bmb6qqlRv9kfUT00EeiNHroK'
  console.log('Pricing - Stripe Key being used:', stripeKey.substring(0, 20) + '...')
  console.log('Pricing - Is test key?', stripeKey.startsWith('pk_test_'))
  console.log('Pricing - Environment variable value:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET')
  
  // Force test mode if not already using test key
  const finalStripeKey = stripeKey.startsWith('pk_test_') ? stripeKey : 'pk_test_51Qt9RuGl6Bh5tV23vSlevMMOTaYxUQCRE56RcKqt4jupCZnGyfQ4DwW8gvj0oZgZUTsGM0Emu6Bmb6qqlRv9kfUT00EeiNHroK'
console.log('Pricing - Final Stripe Key:', finalStripeKey.substring(0, 20) + '...')
const stripePromise = loadStripe(finalStripeKey)

const Pricing = () => {
  const { user } = useAuth()
  const [loadingPlan, setLoadingPlan] = React.useState(null)

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'per month',
      description: 'Get started with budgeting and debt tracking tools.',
      features: [
        'Budgeting & Debt Tracker',
        'Secure account',
        'Basic support',
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline',
      popular: false
    },
    {
      name: 'Basic',
      price: '$5.99',
      period: 'per month',
      description: 'Unlock AI chat and personalized financial coaching.',
      features: [
        'Everything in Free',
        'AI Chat & Coaching',
        'Priority support',
      ],
      buttonText: 'Start Basic',
      buttonVariant: 'outline',
      popular: false
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: 'per month',
      description: 'Full AI credit analysis and score simulation.',
      features: [
        'Everything in Basic',
        'AI Credit Analysis',
        'Score Simulator',
        'Downloadable PDF reports',
      ],
      buttonText: 'Start Premium',
      buttonVariant: 'primary',
      popular: true
    },
    {
      name: 'VIP',
      price: '$19.99',
      period: 'per month',
      description: 'All features plus automated dispute generator.',
      features: [
        'Everything in Premium',
        'Dispute Generator',
        'VIP support',
      ],
      buttonText: 'Go VIP',
      buttonVariant: 'outline',
      popular: false
    }
  ]

  // Only show Free plan if not logged in
  const visiblePlans = user ? plans.filter(p => p.name.toLowerCase() !== 'free') : plans

  // Responsive grid columns based on number of plans
  const gridCols = visiblePlans.length === 1
    ? 'grid-cols-1'
    : visiblePlans.length === 2
    ? 'grid-cols-1 md:grid-cols-2'
    : visiblePlans.length === 3
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'

  const handleSubscribe = async (planName) => {
    const planId = planName.toLowerCase()
    if (!user && planId !== 'free') {
      window.location.href = `/register?plan=${planId}`
      return
    }
    if (planId === 'free') {
      window.location.href = '/register?plan=free'
      return
    }
    try {
      setLoadingPlan(planName)
      const res = await subscriptionAPI.createCheckoutSession(planId)
      if (!res.data || !res.data.id) {
        toast.error('Failed to create Stripe session')
        return
      }
      const sessionId = res.data.id
      const stripe = await stripePromise
      const { error } = await stripe.redirectToCheckout({ sessionId })
      if (error) {
        toast.error(error.message || 'Stripe redirect failed')
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to initiate checkout')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with our free plan and upgrade as your needs grow. All plans include our AI-powered credit analysis and dispute assistance.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className={`grid ${gridCols} gap-8 max-w-7xl mx-auto`}>
          {visiblePlans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-lg border-2 ${
                plan.popular 
                  ? 'border-blue-500 ring-4 ring-blue-500/20' 
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-1">
                      /{plan.period}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.name)}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    plan.buttonVariant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                  }`}
                  disabled={loadingPlan === plan.name}
                >
                  {loadingPlan === plan.name ? 'Redirecting...' : plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ and CTA only if not logged in */}
        {!user && <>
          {/* FAQ Section */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-gray-600">
                  Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Is my data secure?
                </h3>
                <p className="text-gray-600">
                  Absolutely. We use bank-level encryption and never store your sensitive financial information.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Do you offer refunds?
                </h3>
                <p className="text-gray-600">
                  We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I upgrade or downgrade?
                </h3>
                <p className="text-gray-600">
                  Yes, you can change your plan at any time. Changes take effect immediately.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to improve your credit score?
              </h2>
              <p className="text-gray-600 mb-6">
                Join thousands of users who have improved their credit scores with GritScore.ai
              </p>
              <button
                onClick={() => handleSubscribe('Premium')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Your Free Trial
              </button>
            </div>
          </div>
        </>}
      </div>
    </div>
  )
}

export default Pricing 