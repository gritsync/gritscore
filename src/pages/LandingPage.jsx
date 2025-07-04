import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: ChartBarIcon,
    title: 'AI-Powered Credit Analysis',
    description: 'Get instant, comprehensive credit insights powered by GPT-4.1 with personalized improvement strategies.'
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: '24/7 Financial Coaching',
    description: 'Chat with our AI coach for personalized financial advice, budgeting tips, and credit optimization.'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Automated Dispute Resolution',
    description: 'AI-generated dispute letters and automated tracking to resolve credit report errors efficiently.'
  },
  {
    icon: SparklesIcon,
    title: 'Privacy-First Design',
    description: 'Zero-knowledge proofs ensure your sensitive financial data stays private while enabling AI analysis.'
  }
]

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: [
      'Budgeting & Debt Tracker',
      'Secure account',
      'Basic support',
    ]
  },
  {
    name: 'Basic',
    price: '$5.99',
    period: '/month',
    features: [
      'Everything in Free',
      'AI Chat & Coaching',
      'Priority support',
    ]
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: '/month',
    popular: true,
    features: [
      'Everything in Basic',
      'AI Credit Analysis',
      'Score Simulator',
      'Downloadable PDF reports',
    ]
  },
  {
    name: 'VIP',
    price: '$19.99',
    period: '/month',
    features: [
      'Everything in Premium',
      'Dispute Generator',
      'VIP support',
    ]
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-grit-50 via-white to-grit-100">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/static/logo.svg" alt="GritScore.ai" className="h-16 w-auto" />
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-grit-600 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-grit-600 transition-colors">Pricing</a>
            <Link to="/login" className="text-gray-600 hover:text-grit-600 transition-colors">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >

            <h1 className="text-5xl md:text-7xl font-bold text-grit-900 mb-6">
              Transform Your
              <span className="text-gradient block">Financial Future</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              AI-powered credit analysis, personalized coaching, and automated dispute resolution. 
              Your path to financial freedom starts here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-4">
                Start Free Trial
                <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
              </Link>
              <button className="btn-secondary text-lg px-8 py-4">
                Watch Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our cutting-edge technology combines GPT-4.1, PyTorch, and zero-knowledge proofs 
              to deliver unparalleled financial insights while protecting your privacy.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
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

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-grit-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600">
              Start with a free trial, then choose the plan that fits your needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
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
                  <h3 className="text-2xl font-bold text-grit-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-grit-600">{plan.price}</span>
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-grit-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link 
                  to={`/register?plan=${plan.name.toLowerCase()}`}
                  className={`w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular 
                      ? 'bg-grit-600 hover:bg-grit-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-grit-700'
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-grit-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Credit?
          </h2>
          <p className="text-xl text-grit-100 mb-8">
            Join thousands of users who have improved their credit scores with AI-powered insights
          </p>
          <Link to="/register" className="bg-white text-grit-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg text-lg transition-colors">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-grit-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">GritScore.ai</span>
              </div>
              <p className="text-gray-400">
                AI-powered credit analysis and financial coaching for a brighter financial future.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 GritScore.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 