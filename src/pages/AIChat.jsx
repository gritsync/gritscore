import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { chatAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function AIChat() {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [userPreferences, setUserPreferences] = useState({})
  const [conversationContext, setConversationContext] = useState([])
  const [learningInsights, setLearningInsights] = useState([])
  const messagesEndRef = useRef(null)
  const queryClient = useQueryClient()

  // Fetch chat history
  const { data: chatHistoryResponse, isLoading: isLoadingHistory, error: historyError } = useQuery(
    ['chat-history'],
    () => chatAPI.getHistory(),
    { 
      staleTime: 2 * 60 * 1000,
      onError: (error) => {
        console.error('Failed to load chat history:', error)
        toast.error('Failed to load chat history')
      }
    }
  )

  // Fetch financial summary for AI context
  const { data: financialSummary } = useQuery(
    ['financial-summary'],
    () => chatAPI.getFinancialSummary(),
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        console.error('Failed to load financial summary:', error)
      }
    }
  )

  // Extract history from response
  const chatHistory = chatHistoryResponse?.data?.history || []

  // Transform API chat history to match frontend format
  const transformedChatHistory = Array.isArray(chatHistory)
    ? chatHistory.map((msg, index) => ({
        id: msg.id || index,
        type: msg.role === 'user' ? 'user' : 'ai',
        message: msg.message,
        timestamp: new Date(msg.timestamp)
      }))
    : [];

  // Analyze conversation patterns for learning
  useEffect(() => {
    if (transformedChatHistory.length > 0) {
      analyzeConversationPatterns()
    }
  }, [transformedChatHistory])

  const analyzeConversationPatterns = () => {
    const patterns = {
      creditScore: 0,
      budgeting: 0,
      debt: 0,
      disputes: 0,
      investments: 0,
      savings: 0
    }

    const keywords = {
      creditScore: ['credit score', 'fico', 'credit rating', 'score'],
      budgeting: ['budget', 'spending', 'expenses', 'income'],
      debt: ['debt', 'loan', 'payment', 'balance'],
      disputes: ['dispute', 'error', 'wrong', 'incorrect'],
      investments: ['invest', 'stock', 'portfolio', 'return'],
      savings: ['save', 'emergency', 'fund', 'goal']
    }

    transformedChatHistory.forEach(msg => {
      if (msg.type === 'user') {
        const lowerMessage = msg.message.toLowerCase()
        Object.keys(keywords).forEach(category => {
          keywords[category].forEach(keyword => {
            if (lowerMessage.includes(keyword)) {
              patterns[category]++
            }
          })
        })
      }
    })

    // Set user preferences based on patterns
    const topInterests = Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)

    setUserPreferences({
      interests: topInterests,
      totalMessages: transformedChatHistory.length,
      lastActive: new Date()
    })

    // Generate learning insights
    generateLearningInsights(patterns)
  }

  const generateLearningInsights = (patterns) => {
    const insights = []
    
    if (patterns.creditScore > 2) {
      insights.push({
        type: 'credit_focus',
        message: 'You seem focused on credit scores. Consider tracking your score trends over time.',
        icon: ArrowTrendingUpIcon,
        color: 'text-blue-600'
      })
    }
    
    if (patterns.budgeting > 2) {
      insights.push({
        type: 'budgeting_focus',
        message: 'Budgeting is a key interest. Let\'s create a personalized budget plan.',
        icon: ChartBarIcon,
        color: 'text-green-600'
      })
    }
    
    if (patterns.debt > 2) {
      insights.push({
        type: 'debt_focus',
        message: 'Debt management is important. I can help create a debt payoff strategy.',
        icon: ExclamationTriangleIcon,
        color: 'text-yellow-600'
      })
    }

    setLearningInsights(insights)
  }

  // Send message mutation
  const sendMessageMutation = useMutation(
    (messageText) => chatAPI.sendMessage(messageText),
    {
      onSuccess: (response, messageText) => {
        queryClient.invalidateQueries(['chat-history'])
        setIsTyping(false)
        console.log('Message sent successfully:', response)
        toast.success('Message sent successfully!')
        
        // Update conversation context
        setConversationContext(prev => [...prev, {
          role: 'user',
          content: messageText,
          timestamp: new Date()
        }])
      },
      onError: (error) => {
        console.error('Failed to send message:', error)
        const errorMessage = error.response?.data?.error || 'Failed to send message. Please try again.'
        toast.error(errorMessage)
        setIsTyping(false)
      }
    }
  )

  // Clear history mutation
  const clearHistoryMutation = useMutation(
    () => chatAPI.clearHistory(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat-history'])
        setConversationContext([])
        setLearningInsights([])
        setUserPreferences({})
        toast.success('Chat history cleared')
      },
      onError: (error) => {
        console.error('Failed to clear chat history:', error)
        toast.error('Failed to clear chat history')
      }
    }
  )

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [transformedChatHistory])

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    const messageText = message.trim()
    setMessage('')
    setIsTyping(true)

    // Send message immediately
    sendMessageMutation.mutate(messageText)
  }

  // Get personalized quick actions based on user preferences
  const getPersonalizedQuickActions = () => {
    const baseActions = [
      {
        text: "Analyze my spending patterns",
        icon: "📊",
        category: "budgeting"
      },
      {
        text: "Help me create a budget plan",
        icon: "💰",
        category: "budgeting"
      },
      {
        text: "How can I improve my credit score?",
        icon: "📈",
        category: "creditScore"
      },
      {
        text: "Give me debt payoff advice",
        icon: "💳",
        category: "debt"
      },
      {
        text: "What's my financial summary?",
        icon: "📋",
        category: "general"
      },
      {
        text: "Suggest ways to save money",
        icon: "💡",
        category: "savings"
      }
    ]

    // Prioritize actions based on user interests
    if (userPreferences.interests) {
      return baseActions.sort((a, b) => {
        const aPriority = userPreferences.interests.includes(a.category) ? 1 : 0
        const bPriority = userPreferences.interests.includes(b.category) ? 1 : 0
        return bPriority - aPriority
      })
    }

    return baseActions
  }

  const quickActions = getPersonalizedQuickActions()

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Financial Coach</h1>
          <p className="mt-1 text-sm text-gray-500">
            Get personalized financial advice and credit coaching 24/7
          </p>
          <div className="mt-2 flex items-center text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <SparklesIcon className="w-3 h-3 mr-1" />
            AI has access to your financial data for personalized advice
          </div>
          {financialSummary && (
            <div className="mt-2 text-xs text-gray-600">
              {financialSummary.has_data ? (
                <>
                  <span className="font-medium">Data available:</span> {financialSummary.recent_transactions_count || 0} transactions, {financialSummary.debts_count || 0} debts, {financialSummary.credit_reports_count || 0} credit reports
                </>
              ) : (
                <>
                  <span className="font-medium">No financial data yet.</span> Add transactions, debts, or credit reports for personalized advice.
                </>
              )}
            </div>
          )}
          
          {/* Learning Insights */}
          {learningInsights.length > 0 && (
            <div className="mt-3 space-y-2">
              {learningInsights.map((insight, index) => (
                <div key={index} className="flex items-center text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  <LightBulbIcon className="w-4 h-4 mr-2" />
                  <span>{insight.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => clearHistoryMutation.mutate()}
          className="btn-secondary flex items-center"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Clear History
        </button>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoadingHistory && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-grit-600"></div>
            </div>
          )}
          {!isLoadingHistory && transformedChatHistory.length === 0 && !historyError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-500 mb-6">
                {financialSummary?.has_data 
                  ? "Ask me anything about your credit, budgeting, or financial goals. I have access to your financial data for personalized advice."
                  : "Ask me anything about your credit, budgeting, or financial goals. Add some transactions or debts for personalized advice."
                }
              </p>
              
              {/* Personalized welcome based on user preferences */}
              {userPreferences.interests && userPreferences.interests.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Based on your interests:</h4>
                  <div className="flex flex-wrap gap-2">
                    {userPreferences.interests.map((interest, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {interest.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {historyError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load chat</h3>
              <p className="text-gray-500 mb-4">There was an error loading your chat history.</p>
              <button 
                onClick={() => queryClient.invalidateQueries(['chat-history'])} 
                className="px-4 py-2 bg-grit-600 text-white rounded-lg hover:bg-grit-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          <AnimatePresence>
            {transformedChatHistory.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start space-x-3 ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.type === 'user' 
                        ? 'bg-grit-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {msg.type === 'user' ? (
                        <UserIcon className="w-4 h-4" />
                      ) : (
                        <SparklesIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`flex-1 ${msg.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-4 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-grit-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.message}
                        </div>
                      </div>
                      <div className={`text-xs text-gray-500 mt-1 ${
                        msg.type === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="inline-block p-4 rounded-lg bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Personalized Quick Actions */}
        {transformedChatHistory.length === 0 && !isLoadingHistory && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {userPreferences.interests ? 'Personalized Suggestions' : 'Quick Actions'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMessage(action.text)
                    // Auto-send the message after a short delay
                    setTimeout(() => {
                      if (action.text) {
                        setIsTyping(true)
                        sendMessageMutation.mutate(action.text)
                        setMessage('')
                      }
                    }, 100)
                  }}
                  className={`p-3 text-left border border-gray-200 rounded-lg hover:border-grit-300 hover:bg-grit-50 transition-colors ${
                    userPreferences.interests?.includes(action.category) ? 'border-grit-300 bg-grit-50' : ''
                  }`}
                >
                  <div className="text-lg mb-1">{action.icon}</div>
                  <div className="text-sm text-gray-700">{action.text}</div>
                  {userPreferences.interests?.includes(action.category) && (
                    <div className="text-xs text-grit-600 mt-1">Based on your interests</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-6 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything about your credit, budgeting, or financial goals..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grit-500 focus:border-grit-500 transition-colors"
                disabled={isTyping}
              />
            </div>
            <button
              type="submit"
              disabled={!message.trim() || isTyping}
              className="px-6 py-3 bg-grit-600 text-white rounded-lg hover:bg-grit-700 focus:outline-none focus:ring-2 focus:ring-grit-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Powered by GPT-4.1 • Your conversations are private and secure • AI learns from your patterns
          </p>
        </div>
      </div>
    </div>
  )
} 