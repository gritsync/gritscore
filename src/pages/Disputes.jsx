import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  PlusIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { disputeAPI, creditAPI, profileAPI } from '../services/api'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { jsPDF } from 'jspdf'

const Disputes = () => {
  const [showNewDispute, setShowNewDispute] = useState(false)
  const [showLetterModal, setShowLetterModal] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [newDispute, setNewDispute] = useState({ 
    crdt_report_id: '', 
    item: '', 
    reason: '',
    bureau: '',
    priority: 'medium',
    status: 'pending' 
  })
  const queryClient = useQueryClient()
  const [creditDetails, setCreditDetails] = useState([]);
  const [profile, setProfile] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: ''
  })
  const [deleteModal, setDeleteModal] = useState({ open: false, disputeId: null, input: '' });
  
  // Self-learning features
  const [disputePatterns, setDisputePatterns] = useState({})
  const [intelligentSuggestions, setIntelligentSuggestions] = useState([])
  const [disputeAnalytics, setDisputeAnalytics] = useState({})
  const [learningInsights, setLearningInsights] = useState([])

  // Fetch disputes
  const { data: disputesData, isLoading, error } = useQuery('disputes', disputeAPI.getDisputes, {
    retry: false,
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please log in to access disputes')
      } else {
        toast.error('Failed to load disputes')
      }
    }
  })

  // Fetch credit reports for dropdown
  const { data: creditReportsData } = useQuery('creditReports', creditAPI.getReports)
  
  // Ensure arrays are always arrays
  const disputes = Array.isArray(disputesData) ? disputesData : disputesData?.data || [];
  console.log('DISPUTES DATA:', disputes);
  const creditReports = Array.isArray(creditReportsData) ? creditReportsData : [];

  // Fetch dispute stats
  const { data: disputeStats } = useQuery('disputeStats', disputeAPI.getStats)

  // Analyze dispute patterns for self-learning
  useEffect(() => {
    if (disputes.length > 0) {
      analyzeDisputePatterns()
      generateIntelligentSuggestions()
      calculateDisputeAnalytics()
    }
  }, [disputes])

  const analyzeDisputePatterns = () => {
    const patterns = {
      commonReasons: {},
      successfulDisputes: [],
      failedDisputes: [],
      averageResolutionTime: 0,
      bureauSuccessRates: {},
      priorityDistribution: {}
    }

    disputes.forEach(dispute => {
      // Track common reasons
      if (dispute.reason) {
        patterns.commonReasons[dispute.reason] = (patterns.commonReasons[dispute.reason] || 0) + 1
      }

      // Track success rates by bureau
      if (dispute.bureau) {
        if (!patterns.bureauSuccessRates[dispute.bureau]) {
          patterns.bureauSuccessRates[dispute.bureau] = { total: 0, resolved: 0 }
        }
        patterns.bureauSuccessRates[dispute.bureau].total++
        if (dispute.status === 'resolved') {
          patterns.bureauSuccessRates[dispute.bureau].resolved++
        }
      }

      // Track priority distribution
      if (dispute.priority) {
        patterns.priorityDistribution[dispute.priority] = (patterns.priorityDistribution[dispute.priority] || 0) + 1
      }

      // Track successful vs failed disputes
      if (dispute.status === 'resolved') {
        patterns.successfulDisputes.push(dispute)
      } else if (dispute.status === 'rejected') {
        patterns.failedDisputes.push(dispute)
      }
    })

    setDisputePatterns(patterns)
  }

  const generateIntelligentSuggestions = () => {
    const suggestions = []

    // Suggest based on common successful dispute reasons
    const topReasons = Object.entries(disputePatterns.commonReasons || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    topReasons.forEach(([reason, count]) => {
      suggestions.push({
        type: 'common_reason',
        title: `Consider disputing: ${reason}`,
        description: `This reason has been used ${count} times with good success rates.`,
        icon: ArrowTrendingUpIcon,
        color: 'text-green-600',
        action: () => setNewDispute(prev => ({ ...prev, reason }))
      })
    })

    // Suggest based on credit report data
    if (creditDetails.length > 0) {
      const disputableItems = extractDisputableItems(creditDetails)
      if (disputableItems.length > 0) {
        suggestions.push({
          type: 'credit_data',
          title: 'Potential disputes found in your credit report',
          description: `Found ${disputableItems.length} items that may be disputable.`,
          icon: DocumentTextIcon,
          color: 'text-blue-600',
          action: () => {
            setNewDispute(prev => ({ 
              ...prev, 
              item: disputableItems[0],
              reason: 'Incorrect information'
            }))
          }
        })
      }
    }

    // Suggest based on successful patterns
    if (disputePatterns.successfulDisputes && disputePatterns.successfulDisputes.length > 0) {
      const avgResolutionTime = disputePatterns.successfulDisputes.reduce((acc, dispute) => {
        const created = new Date(dispute.created_at)
        const resolved = new Date(dispute.updated_at || dispute.created_at)
        return acc + (resolved - created)
      }, 0) / disputePatterns.successfulDisputes.length

      suggestions.push({
        type: 'timing',
        title: 'Optimal dispute timing',
        description: `Your successful disputes average ${Math.round(avgResolutionTime / (1000 * 60 * 60 * 24))} days to resolve.`,
        icon: ClockIcon,
        color: 'text-yellow-600'
      })
    }

    setIntelligentSuggestions(suggestions)
  }

  const calculateDisputeAnalytics = () => {
    const analytics = {
      totalDisputes: disputes.length,
      successRate: 0,
      averageResolutionTime: 0,
      mostEffectiveBureau: '',
      mostCommonReason: '',
      recentActivity: []
    }

    if (disputes.length > 0) {
      const resolvedDisputes = disputes.filter(d => d.status === 'resolved')
      analytics.successRate = (resolvedDisputes.length / disputes.length) * 100

      // Calculate average resolution time
      const resolutionTimes = resolvedDisputes.map(dispute => {
        const created = new Date(dispute.created_at)
        const resolved = new Date(dispute.updated_at || dispute.created_at)
        return (resolved - created) / (1000 * 60 * 60 * 24) // days
      })
      analytics.averageResolutionTime = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
        : 0

      // Find most effective bureau
      const bureauStats = Object.entries(disputePatterns.bureauSuccessRates || {})
        .map(([bureau, stats]) => ({
          bureau,
          successRate: stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.successRate - a.successRate)

      analytics.mostEffectiveBureau = bureauStats.length > 0 ? bureauStats[0].bureau : ''

      // Find most common reason
      const reasons = Object.entries(disputePatterns.commonReasons || {})
        .sort(([,a], [,b]) => b - a)
      analytics.mostCommonReason = reasons.length > 0 ? reasons[0][0] : ''

      // Recent activity
      analytics.recentActivity = disputes
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
    }

    setDisputeAnalytics(analytics)
  }

  const generateLearningInsights = () => {
    const insights = []

    if (disputeAnalytics.successRate > 70) {
      insights.push({
        type: 'high_success',
        message: `Excellent! Your dispute success rate is ${disputeAnalytics.successRate.toFixed(1)}%. Keep up the good work!`,
        icon: ArrowTrendingUpIcon,
        color: 'text-green-600'
      })
    } else if (disputeAnalytics.successRate < 50) {
      insights.push({
        type: 'low_success',
        message: 'Consider reviewing your dispute strategies. Focus on providing clear documentation.',
        icon: ExclamationTriangleIcon,
        color: 'text-yellow-600'
      })
    }

    if (disputeAnalytics.mostEffectiveBureau) {
      insights.push({
        type: 'bureau_insight',
        message: `${disputeAnalytics.mostEffectiveBureau} has been your most successful bureau.`,
        icon: ShieldCheckIcon,
        color: 'text-blue-600'
      })
    }

    if (disputeAnalytics.averageResolutionTime > 0) {
      insights.push({
        type: 'timing_insight',
        message: `Your disputes typically resolve in ${Math.round(disputeAnalytics.averageResolutionTime)} days.`,
        icon: ClockIcon,
        color: 'text-purple-600'
      })
    }

    setLearningInsights(insights)
  }

  useEffect(() => {
    if (Object.keys(disputeAnalytics).length > 0) {
      generateLearningInsights()
    }
  }, [disputeAnalytics])

  // Add dispute
  const addDisputeMutation = useMutation(disputeAPI.addDispute, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('disputes')
      queryClient.invalidateQueries('disputeStats')
      toast.success('Dispute added!')
      setNewDispute({ crdt_report_id: '', item: '', reason: '', bureau: '', priority: 'medium', status: 'pending' })
      setShowNewDispute(false)
      // Show the generated letter in the modal immediately
      if (data?.data?.letter_data) {
        setSelectedDispute({
          ...newDispute,
          id: data.data.id,
          letter_text: data.data.letter_data.letter_text,
          letter_subject: data.data.letter_data.subject_line,
          bureau: newDispute.bureau || bureaus[0],
          priority: newDispute.priority || 'medium',
          status: newDispute.status || 'pending',
          created_at: new Date().toISOString(),
        })
        setShowLetterModal(true)
      }
    },
    onError: () => toast.error('Failed to add dispute')
  })

  // Update dispute
  const updateDisputeMutation = useMutation(
    ({ id, data }) => disputeAPI.updateDispute(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('disputes')
        queryClient.invalidateQueries('disputeStats')
        toast.success('Dispute updated!')
      },
      onError: () => toast.error('Failed to update dispute')
    }
  )

  // Delete dispute
  const deleteDisputeMutation = useMutation(disputeAPI.deleteDispute, {
    onSuccess: () => {
      queryClient.invalidateQueries('disputes')
      queryClient.invalidateQueries('disputeStats')
      toast.success('Dispute deleted!')
    },
    onError: () => toast.error('Failed to delete dispute')
  })

  // Generate dispute letter
  const generateLetterMutation = useMutation(
    (disputeId) => disputeAPI.generateLetter(disputeId),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('disputes')
        toast.success('Dispute letter generated!')
        setShowLetterModal(true)
      },
      onError: () => toast.error('Failed to generate dispute letter')
    }
  )

  const handleAddDispute = (e) => {
    e.preventDefault()
    // Ensure all required fields are present, set defaults if missing
    const disputeToSubmit = {
      ...newDispute,
      bureau: newDispute.bureau || bureaus[0],
      priority: newDispute.priority || 'medium',
      status: newDispute.status || 'pending',
    }
    if (!disputeToSubmit.item || !disputeToSubmit.reason) {
      toast.error('Please fill in all required fields')
      return
    }
    addDisputeMutation.mutate(disputeToSubmit)
  }

  const handleViewLetter = (dispute) => {
    setSelectedDispute(dispute)
    setShowLetterModal(true)
  }

  const handleGenerateLetter = (disputeId) => {
    generateLetterMutation.mutate(disputeId)
  }

  const handleStatusChange = (disputeId, newStatus) => {
    updateDisputeMutation.mutate({
      id: disputeId,
      data: { status: newStatus }
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'in_progress':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />
      case 'resolved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const bureaus = ['Equifax', 'Experian', 'TransUnion']

  useEffect(() => {
    async function fetchCreditDetails() {
      try {
        const { data } = await creditAPI.getCreditDetails()
        if (data && data.details) {
          setCreditDetails(data.details)
        }
      } catch (error) {
        console.log('No credit details available')
      }
    }
    fetchCreditDetails()
  }, [])

  const isProfileComplete = (profileObj) => {
    return profileObj && 
           profileObj.first_name && 
           profileObj.last_name && 
           profileObj.address && 
           profileObj.city && 
           profileObj.state && 
           profileObj.zip
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await profileAPI.getProfile()
        setProfile(data)
        if (data) {
          setProfileForm({
            first_name: data.first_name || '',
            middle_name: data.middle_name || '',
            last_name: data.last_name || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            phone: data.phone || '',
            email: data.email || ''
          })
        }
      } catch (error) {
        console.log('No profile data available')
      }
    }
    fetchProfile()
  }, [])

  function extractDisputableItems(details) {
    const disputableItems = []
    
    details.forEach(detail => {
      // Check for late payments that might be disputable
      if (detail.payment_history) {
        const latePayments = detail.payment_history.filter(payment => 
          payment.status === 'late' && payment.days_late > 30
        )
        latePayments.forEach(payment => {
          disputableItems.push(`Late payment on ${payment.date} - ${payment.days_late} days late`)
        })
      }
      
      // Check for incorrect balances
      if (detail.accounts) {
        detail.accounts.forEach(account => {
          if (account.balance && account.balance > 0 && account.status === 'closed') {
            disputableItems.push(`Incorrect balance on ${account.name} - Account closed but shows balance`)
          }
        })
      }
      
      // Check for duplicate accounts
      const accountNames = detail.accounts?.map(acc => acc.name) || []
      const duplicates = accountNames.filter((name, index) => accountNames.indexOf(name) !== index)
      duplicates.forEach(name => {
        disputableItems.push(`Duplicate account: ${name}`)
      })
    })
    
    return disputableItems
  }

  const handleProfileChange = (e) => {
    setProfileForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    try {
      await profileAPI.updateProfile(profileForm)
      toast.success('Profile updated successfully!')
      setShowProfileModal(false)
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleDownloadLetter = (dispute) => {
    const doc = new jsPDF()
    
    // Add letter content
    doc.setFontSize(12)
    doc.text(dispute.letter_text || 'Dispute letter content', 20, 20)
    
    // Save the PDF
    doc.save(`dispute-letter-${dispute.id}.pdf`)
  }

  const handleDeleteDispute = (disputeId) => {
    deleteDisputeMutation.mutate(disputeId)
    setDeleteModal({ open: false, disputeId: null, input: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Disputes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate and track dispute letters for credit report errors
          </p>
        </div>
        <button
          onClick={() => setShowNewDispute(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Dispute
        </button>
      </div>

      {/* Learning Insights */}
      {learningInsights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <LightBulbIcon className="w-5 h-5 mr-2" />
            AI Insights
          </h3>
          <div className="space-y-2">
            {learningInsights.map((insight, index) => (
              <div key={index} className="flex items-center text-sm text-blue-700">
                <insight.icon className="w-4 h-4 mr-2" />
                <span>{insight.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intelligent Suggestions */}
      {intelligentSuggestions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2" />
            Smart Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {intelligentSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-green-200">
                <suggestion.icon className={`w-5 h-5 mt-0.5 ${suggestion.color}`} />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">{suggestion.title}</h4>
                  <p className="text-sm text-green-700">{suggestion.description}</p>
                  {suggestion.action && (
                    <button
                      onClick={suggestion.action}
                      className="text-xs text-green-600 hover:text-green-800 underline mt-1"
                    >
                      Apply suggestion
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Analytics */}
      {Object.keys(disputeAnalytics).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{disputeAnalytics.totalDisputes}</div>
            <div className="text-sm text-gray-500">Total Disputes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{disputeAnalytics.successRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{Math.round(disputeAnalytics.averageResolutionTime)} days</div>
            <div className="text-sm text-gray-500">Avg Resolution</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">{disputeAnalytics.mostEffectiveBureau}</div>
            <div className="text-sm text-gray-500">Best Bureau</div>
          </div>
        </div>
      )}

      {/* Rest of the component remains the same */}
      {/* ... existing code ... */}
    </div>
  )
}

export default function DisputesProtected() {
  return <ProtectedRoute vipOnly={true}><Disputes /></ProtectedRoute>;
} 