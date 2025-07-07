import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  CalculatorIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { creditAPI, chatAPI, disputeAPI, subscriptionAPI, creditDetailsAPI } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { Dialog } from '@headlessui/react'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [lockedFeature, setLockedFeature] = useState('')
  const [creditData, setCreditData] = useState(null)
  const [creditLoading, setCreditLoading] = useState(true)

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await subscriptionAPI.getCurrentPlan()
        setPlan(res.data.plan)
      } catch (e) {
        setPlan('Free')
      } finally {
        setPlanLoading(false)
      }
    }
    fetchPlan()
  }, [])

  // Fetch credit simulator data
  useEffect(() => {
    async function fetchCreditData() {
      try {
        const { data } = await creditDetailsAPI.getSummary()
        if (data && data.summary) {
          setCreditData(data)
        }
      } catch (error) {
        console.log('No credit data available')
      } finally {
        setCreditLoading(false)
      }
    }
    fetchCreditData()
  }, [])

  // Fetch dashboard data
  const { data: creditDataAPI, isLoading: creditLoadingAPI } = useQuery(
    ['credit-overview'],
    () => creditAPI.getAnalyses(),
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  )

  const { data: chatHistory, isLoading: chatLoading } = useQuery(
    ['chat-history'],
    () => chatAPI.getHistory(),
    { staleTime: 2 * 60 * 1000 } // 2 minutes
  )

  const { data: disputes, isLoading: disputesLoading } = useQuery(
    ['disputes'],
    () => disputeAPI.getDisputes(),
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  )

  // Get personalized credit score data
  const getPersonalizedCreditData = () => {
    if (creditData && creditData.summary) {
      // Parse credit score from summary
      const scoreMatch = creditData.summary.match(/credit score[:\s]*(\d+)/i)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 681
      
      // Parse utilization from summary
      const utilMatch = creditData.summary.match(/utilization[:\s]*(\d+(?:\.\d+)?)/i)
      const utilization = utilMatch ? parseFloat(utilMatch[1]) : 25
      
      return {
        current: score,
        previous: score - Math.floor(Math.random() * 20) + 5, // Simulate previous score
        change: Math.floor(Math.random() * 30) - 15, // Random change
        trend: score > 700 ? 'up' : 'down',
        utilization: utilization,
        history: [
          { date: 'Jan', score: score - 15 },
          { date: 'Feb', score: score - 10 },
          { date: 'Mar', score: score - 5 },
          { date: 'Apr', score: score },
          { date: 'May', score: score + 5 },
          { date: 'Jun', score: score + 10 },
        ]
      }
    }
    
    // Fallback to mock data
    return {
      current: 681,
      previous: 665,
      change: 16,
      trend: 'up',
      utilization: 25,
      history: [
        { date: 'Jan', score: 650 },
        { date: 'Feb', score: 665 },
        { date: 'Mar', score: 680 },
        { date: 'Apr', score: 695 },
        { date: 'May', score: 710 },
        { date: 'Jun', score: 725 },
      ]
    }
  }

  const personalizedCreditData = getPersonalizedCreditData()

  // Get personalized credit factors based on user data
  const getPersonalizedCreditFactors = () => {
    const factors = [
      { name: 'Payment History', value: 35, color: '#0ea5e9' },
      { name: 'Credit Utilization', value: 30, color: '#22c55e' },
      { name: 'Credit Age', value: 15, color: '#f59e0b' },
      { name: 'Credit Mix', value: 10, color: '#ef4444' },
      { name: 'New Credit', value: 10, color: '#8b5cf6' },
    ]
    
    // Adjust based on user's actual data
    if (personalizedCreditData.utilization > 30) {
      factors[1].value = 40 // Higher impact if utilization is high
      factors[0].value = 30
    }
    
    return factors
  }

  const personalizedCreditFactors = getPersonalizedCreditFactors()

  // Get personalized quick actions based on user data
  const getPersonalizedQuickActions = () => {
    const baseActions = [
      {
        title: 'Upload Credit Report',
        description: 'Get AI-powered analysis of your credit report',
        icon: ChartBarIcon,
        href: '/app/analysis',
        color: 'bg-grit-500',
        priority: 1
      },
      {
        title: 'Chat with AI Coach',
        description: 'Get personalized financial advice',
        icon: ChatBubbleLeftRightIcon,
        href: '/app/chat',
        color: 'bg-green-500',
        priority: 2
      },
      {
        title: 'Create Dispute',
        description: 'Generate dispute letters for errors',
        icon: DocumentTextIcon,
        href: '/app/disputes',
        color: 'bg-yellow-500',
        priority: 3
      },
      {
        title: 'Budget Planning',
        description: 'Plan and track your spending',
        icon: CalculatorIcon,
        href: '/app/budgeting',
        color: 'bg-purple-500',
        priority: 4
      },
    ]

    // Personalize based on credit score
    if (personalizedCreditData.current < 650) {
      baseActions[0].description = 'Improve your credit score with AI analysis'
      baseActions[1].description = 'Get urgent credit improvement advice'
    } else if (personalizedCreditData.current > 750) {
      baseActions[0].description = 'Maintain your excellent credit score'
      baseActions[1].description = 'Optimize your financial strategy'
    }

    // Personalize based on utilization
    if (personalizedCreditData.utilization > 30) {
      baseActions[3].description = 'Reduce your high credit utilization'
    }

    return baseActions.sort((a, b) => a.priority - b.priority)
  }

  const personalizedQuickActions = getPersonalizedQuickActions()

  // Get personalized recent activities
  const getPersonalizedRecentActivities = () => {
    const activities = []
    
    // Add credit analysis activity if data exists
    if (creditData && creditData.summary) {
      activities.push({
        id: 1,
        type: 'credit_analysis',
        title: 'Credit Report Analyzed',
        description: `Your credit score: ${personalizedCreditData.current}`,
        time: '2 hours ago',
        status: 'completed',
      })
    }
    
    // Add dispute activity if disputes exist
    if (disputes && disputes.length > 0) {
      activities.push({
        id: 2,
        type: 'dispute_created',
        title: 'Dispute Letter Generated',
        description: `${disputes.length} dispute${disputes.length > 1 ? 's' : ''} in progress`,
        time: '1 day ago',
        status: 'pending',
      })
    }
    
    // Add chat activity if chat history exists
    if (chatHistory && chatHistory.length > 0) {
      activities.push({
        id: 3,
        type: 'ai_chat',
        title: 'AI Chat Session',
        description: 'You had a personalized chat with your AI coach',
        time: '2 days ago',
        status: 'completed',
      })
    }
    
    // Add default activities if no real data
    if (activities.length === 0) {
      activities.push(
        {
          id: 1,
          type: 'welcome',
          title: 'Welcome to GritScore.ai!',
          description: 'Start by uploading your credit report for personalized analysis',
          time: 'Just now',
          status: 'completed',
        },
        {
          id: 2,
          type: 'tip',
          title: 'Credit Score Tip',
          description: `Your current score: ${personalizedCreditData.current}. Focus on payment history and utilization.`,
          time: '1 hour ago',
          status: 'completed',
        }
      )
    }
    
    return activities
  }

  const personalizedRecentActivities = getPersonalizedRecentActivities()

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-green-600'
    if (score >= 700) return 'text-blue-600'
    if (score >= 650) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreRating = (score) => {
    if (score >= 750) return 'Excellent'
    if (score >= 700) return 'Good'
    if (score >= 650) return 'Fair'
    if (score >= 600) return 'Poor'
    return 'Very Poor'
  }

  // Plan badge color
  const planColors = {
    Free: 'bg-gray-400',
    Basic: 'bg-blue-500',
    Premium: 'bg-purple-500',
    VIP: 'bg-yellow-500',
  }

  // Plan feature access
  const planAccess = {
    Free:    { budgeting: true, aiChat: false, analysis: false, disputes: false },
    Basic:   { budgeting: true, aiChat: true,  analysis: false, disputes: false },
    Premium: { budgeting: true, aiChat: true,  analysis: true,  disputes: false },
    VIP:     { budgeting: true, aiChat: true,  analysis: true,  disputes: true  },
  }
  const currentAccess = planAccess[plan] || planAccess.Free

  // Only show upgrade buttons for free users
  const quickActionsWithLock = personalizedQuickActions.map(action => {
    let locked = false
    if (action.title.includes('Dispute') && !currentAccess.disputes) locked = true
    if (action.title.includes('AI Coach') && !currentAccess.aiChat) locked = true
    if (action.title.includes('Budget') && !currentAccess.budgeting) locked = true
    if (action.title.includes('Upload') && !currentAccess.analysis) locked = true
    return { ...action, locked }
  })

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6 lg:px-0 max-w-7xl mx-auto w-full">
      {/* Upgrade Banner for Free plan only */}
      {!planLoading && plan === 'Free' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 rounded-lg shadow-sm">
          <span className="text-yellow-800 font-medium">Unlock AI Chat, Credit Analysis, and more by upgrading your plan!</span>
          <Link to="/app/pricing" className="btn btn-primary ml-0 sm:ml-4 w-full sm:w-auto">Upgrade</Link>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-theme-text flex items-center gap-2">
            Dashboard
            {!planLoading && plan && (
              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold text-white ${planColors[plan]}`}>{plan}</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-theme-primary">
            Welcome back{user?.name ? `, ${user.name}` : user?.email ? `, ${user.email}` : ''}! Here's your personalized financial overview.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 sm:mt-0">
          {/* Only show upgrade button for free users */}
          {plan === 'Free' && !planLoading && (
            <Link to="/app/pricing" className="btn btn-primary w-full sm:w-auto">Upgrade</Link>
          )}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="input-field w-full sm:w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* What's included in your plan */}
      {!planLoading && plan && (
        <div className="card bg-blue-50 border-blue-200 rounded-lg p-4 mb-2">
          <h3 className="font-semibold mb-2">What's included in your <span className="capitalize">{plan}</span> plan:</h3>
          <ul className="flex flex-wrap gap-4 text-sm">
            <li className={currentAccess.budgeting ? 'text-green-600' : 'text-gray-400'}>Budgeting & Debt Tracker</li>
            <li className={currentAccess.aiChat ? 'text-green-600' : 'text-gray-400'}>AI Chat</li>
            <li className={currentAccess.analysis ? 'text-green-600' : 'text-gray-400'}>AI Credit Analysis</li>
            <li className={currentAccess.disputes ? 'text-green-600' : 'text-gray-400'}>Dispute Generator</li>
          </ul>
        </div>
      )}

      {/* Personalized Credit Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Current Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card rounded-lg shadow-md p-6 bg-white dark:bg-gray-900 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text">Credit Score</h3>
            <ArrowTrendingUpIcon className="w-5 h-5 text-theme-primary" />
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(personalizedCreditData.current)}`}>
              {personalizedCreditData.current}
            </div>
            <div className="text-sm text-gray-600 mb-2">{getScoreRating(personalizedCreditData.current)}</div>
            <div className="flex items-center justify-center mt-2">
              {personalizedCreditData.trend === 'up' ? (
                <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${personalizedCreditData.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {personalizedCreditData.change > 0 ? '+' : ''}{personalizedCreditData.change} points
              </span>
            </div>
            <p className="text-xs text-theme-primary mt-1">vs last month</p>
          </div>
        </motion.div>

        {/* Credit Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card rounded-lg shadow-md p-6 bg-white dark:bg-gray-900 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text">Credit Utilization</h3>
            <CreditCardIcon className="w-5 h-5 text-theme-primary" />
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${personalizedCreditData.utilization > 30 ? 'text-red-600' : 'text-green-600'}`}>
              {personalizedCreditData.utilization}%
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {personalizedCreditData.utilization > 30 ? 'High' : personalizedCreditData.utilization > 10 ? 'Good' : 'Excellent'}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${personalizedCreditData.utilization > 30 ? 'bg-red-500' : personalizedCreditData.utilization > 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(personalizedCreditData.utilization, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-theme-primary mt-2">Target: &lt;30%</p>
          </div>
        </motion.div>

        {/* Score History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card rounded-lg shadow-md p-6 bg-white dark:bg-gray-900 flex flex-col"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score History</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={personalizedCreditData.history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[600, 800]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Credit Factors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="card rounded-lg shadow-md p-6 bg-white dark:bg-gray-900"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Score Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={personalizedCreditFactors}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {personalizedCreditFactors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {personalizedCreditFactors.map((factor, index) => (
              <div key={factor.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: factor.color }} />
                  <span className="text-gray-700">{factor.name}</span>
                </div>
                <span className="font-medium text-gray-900">{factor.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Personalized Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card rounded-lg shadow-md p-6 bg-white dark:bg-gray-900"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActionsWithLock.map((action) => (
            <div key={action.title} className="relative">
              <button
                onClick={() => {
                  if (action.locked) {
                    setLockedFeature(action.title)
                    setShowUpgradeModal(true)
                  } else {
                    window.location.href = action.href
                  }
                }}
                className={`group p-4 border border-gray-200 rounded-lg hover:border-grit-300 hover:shadow-md transition-all duration-200 w-full text-left ${action.locked ? 'opacity-50' : ''}`}
                tabIndex={action.locked ? -1 : 0}
                aria-disabled={action.locked}
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{action.title}</h4>
                <p className="text-sm text-gray-500">{action.description}</p>
              </button>
              {action.locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg pointer-events-none">
                  <span className="text-xs text-gray-500">Upgrade to unlock</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Personalized Recent Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="card rounded-lg shadow-md p-6 bg-white dark:bg-gray-900"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {personalizedRecentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(activity.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-500">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-8 z-10">
            <Dialog.Title className="text-lg font-bold mb-2">Upgrade Required</Dialog.Title>
            <Dialog.Description className="mb-4">
              The feature <span className="font-semibold">{lockedFeature}</span> is only available on higher plans. Upgrade to unlock this and more!
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpgradeModal(false)} className="btn">Cancel</button>
              <Link to="/app/pricing" className="btn btn-primary" onClick={() => setShowUpgradeModal(false)}>Upgrade</Link>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
} 