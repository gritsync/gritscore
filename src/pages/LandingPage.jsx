import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
  WalletIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const features = [
  {
    icon: ChartBarIcon,
    title: 'AI-Powered Credit Analysis',
    description: 'Instant, actionable credit insights powered by GPT-4.1.'
  },
  {
    icon: WalletIcon,
    title: 'Budgeting & Debt Tracker',
    description: 'Track spending, set budgets, and manage debt with ease.'
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: '24/7 Financial Coaching',
    description: 'Personalized AI advice for your financial journey.'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Automated Dispute Resolution',
    description: 'AI-generated dispute letters and tracking for errors.'
  },
  {
    icon: SparklesIcon,
    title: 'Privacy-First Design',
    description: 'Zero-knowledge proofs keep your data private and secure.'
  }
]

const steps = [
  { title: 'Sign Up', description: 'Create your secure account in seconds.' },
  { title: 'Connect', description: 'Easily connect your credit and financial data.' },
  { title: 'Analyze', description: 'Get instant AI-powered analysis and insights.' },
  { title: 'Improve', description: 'Follow personalized steps to boost your score.' },
]

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '3 months only',
    features: [
      'Budgeting & Debt Tracker',
      'Secure account',
      'Basic support',
      'Data archived after 3 months',
    ]
  },
  {
    name: 'Basic',
    price: '$2.99',
    period: 'per month',
    features: [
      'Everything in Free',
      'AI Chat & Coaching',
      'Priority support',
      'Auto-renewal billing',
    ]
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: 'per 6 months',
    popular: true,
    features: [
      'Everything in Basic',
      'AI Credit Analysis',
      'Score Simulator',
      'Downloadable PDF reports',
      'Auto-renewal billing',
    ]
  },
  {
    name: 'VIP',
    price: '$19.99',
    period: 'per 12 months',
    features: [
      'Everything in Premium',
      'Dispute Generator',
      'VIP support',
      'Auto-renewal billing',
    ]
  }
]

const testimonials = [
  { name: 'Alex R.', quote: 'GritScore helped me understand and improve my credit in weeks. The AI coach is a game changer!' },
  { name: 'Jamie L.', quote: 'The budgeting tools and dispute automation saved me hours. Highly recommend!' },
  { name: 'Morgan S.', quote: 'Finally, a financial app that puts privacy first. I trust GritScore with my data.' },
]

const faqs = [
  { q: 'Is my data safe with GritScore?', a: 'Absolutely. We use zero-knowledge proofs and industry best practices to keep your data private and secure.' },
  { q: 'Can I try GritScore for free?', a: 'Yes! Our Free plan includes budgeting and debt tracking tools.' },
  { q: 'How does the AI analysis work?', a: 'We use advanced AI (GPT-4.1) to analyze your credit and provide actionable insights.' },
]

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(Array(faqs.length).fill(false))
  return (
    <div className="min-h-screen bg-gradient-to-br from-grit-50 via-white to-grit-100 flex flex-col">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/gritscore.png" alt="GritScore Logo" className="h-14 w-14 rounded" />
            <span className="text-3xl font-extrabold text-[#1769a6] tracking-tight">GritScore</span>
          </div>
          {/* Hamburger for mobile */}
          <button className="md:hidden p-2" onClick={() => setNavOpen(!navOpen)}>
            <svg className="w-7 h-7 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-grit-600 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-grit-600 transition-colors">Pricing</a>
            <a href="#testimonials" className="text-gray-600 hover:text-grit-600 transition-colors">Testimonials</a>
            <Link to="/login" className="text-gray-600 hover:text-grit-600 transition-colors">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
        {/* Mobile nav dropdown */}
        {navOpen && (
          <div className="md:hidden mt-3 bg-white dark:bg-gray-900 rounded shadow-lg py-4 px-6 flex flex-col space-y-4 absolute left-0 right-0 top-full z-20">
            <a href="#features" className="text-gray-700 dark:text-white hover:text-grit-600 transition-colors" onClick={() => setNavOpen(false)}>Features</a>
            <a href="#pricing" className="text-gray-700 dark:text-white hover:text-grit-600 transition-colors" onClick={() => setNavOpen(false)}>Pricing</a>
            <a href="#testimonials" className="text-gray-700 dark:text-white hover:text-grit-600 transition-colors" onClick={() => setNavOpen(false)}>Testimonials</a>
            <Link to="/login" className="text-gray-700 dark:text-white hover:text-grit-600 transition-colors" onClick={() => setNavOpen(false)}>Login</Link>
            <Link to="/register" className="btn-primary" onClick={() => setNavOpen(false)}>Get Started</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-6 py-20 bg-gradient-to-br from-grit-50 via-white to-grit-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-grit-900 mb-6 leading-tight">
            Unlock Your <span className="text-gradient">Financial Power</span>
          </h1>
          <p className="text-2xl md:text-3xl text-gray-700 mb-8 max-w-2xl mx-auto font-medium">
            AI-powered credit analysis, budgeting, coaching, and dispute resolution—all in one privacy-first platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/register" className="btn-primary text-lg px-8 py-4 shadow-lg">
              Start Free Trial
              <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
            </Link>
            <button className="btn-secondary text-lg px-8 py-4 shadow">
              Watch Demo
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">Why GritScore?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">All-in-one financial intelligence, powered by advanced AI and privacy-first technology.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="card text-center hover:shadow-lg transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-grit-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-grit-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-20 bg-gradient-to-br from-grit-100 via-white to-grit-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Get started in minutes and see real results fast.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="card text-center flex flex-col items-center p-6"
              >
                <div className="w-12 h-12 rounded-full bg-grit-600 text-white flex items-center justify-center mb-4 font-bold text-xl">
                  {idx + 1}
                </div>
                <h4 className="text-lg font-semibold mb-2">
                  {step.title}
                </h4>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">Choose Your Plan</h2>
            <p className="text-xl text-gray-600">Start free, then upgrade as you grow.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, idx) => (
              <div
                key={plan.name}
                className={`card relative ${plan.popular ? 'ring-2 ring-grit-500 scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-grit-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-grit-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-grit-600">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 ml-1">/{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-700">
                      <CheckIcon className="w-5 h-5 text-grit-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Link
                  to="/register"
                  className={`btn-primary w-full ${plan.popular ? 'bg-grit-600 hover:bg-grit-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-grit-700'}`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="px-6 py-20 bg-gradient-to-br from-grit-100 via-white to-grit-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Real stories from people who improved their financial lives with GritScore.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div
                key={t.name}
                className="card p-6 text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-grit-600 text-white flex items-center justify-center mb-4 font-bold text-2xl">
                  {t.name[0]}
                </div>
                <p className="text-lg italic mb-4">
                  “{t.quote}”
                </p>
                <span className="font-semibold text-grit-900">
                  {t.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                className="border rounded-lg p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                onClick={() => setFaqOpen(faqOpen.map((open, i) => i === idx ? !open : open))}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-grit-900">
                    {faq.q}
                  </span>
                  <span className="text-grit-500 font-bold text-xl">
                    {faqOpen[idx] ? '-' : '+'}
                  </span>
                </div>
                {faqOpen[idx] && <p className="mt-2 text-gray-700">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-grit-900 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/gritscore.png" alt="GritScore Logo" className="h-10 w-10 rounded" />
            <span className="text-xl font-extrabold tracking-tight">GritScore</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <a href="#features" className="hover:underline">Features</a>
            <a href="#pricing" className="hover:underline">Pricing</a>
            <a href="#testimonials" className="hover:underline">Testimonials</a>
            <a href="#" className="hover:underline">About</a>
            <a href="#" className="hover:underline">Contact</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
          </div>
          <div className="text-xs text-gray-300 mt-4 md:mt-0">© {new Date().getFullYear()} GritScore. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
} 