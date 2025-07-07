import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../services/supabase'
import { 
  HomeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CalculatorIcon,
  DocumentTextIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  SwatchIcon
} from '@heroicons/react/24/outline'

// Plan-based feature access
const planAccess = {
  free:    { budgeting: true, aiChat: false, analysis: false, disputes: false },
  basic:   { budgeting: true, aiChat: true,  analysis: false, disputes: false },
  premium: { budgeting: true, aiChat: true,  analysis: true,  disputes: false },
  vip:     { budgeting: true, aiChat: true,  analysis: true,  disputes: true  },
}

// Function to generate initials from name
const getInitials = (name) => {
  if (!name) return ''
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Function to generate gradient colors based on name
const getGradientColors = (name) => {
  if (!name) return 'from-gray-400 to-gray-500'
  
  const colors = [
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-purple-500 to-pink-500',
    'from-indigo-500 to-blue-500',
    'from-pink-500 to-rose-500',
    'from-yellow-500 to-orange-500',
    'from-emerald-500 to-green-500'
  ]
  
  // Use name to consistently select a color
  const hash = name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  
  return colors[Math.abs(hash) % colors.length]
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { currentTheme, changeTheme, isThemeMenuOpen, setIsThemeMenuOpen, themes } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [supabaseUser, setSupabaseUser] = useState(null)
  const [supabaseProfile, setSupabaseProfile] = useState(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState('Free Plan')
  const themeMenuRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Handle clicking outside theme menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false)
      }
    }

    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isThemeMenuOpen, setIsThemeMenuOpen])

  useEffect(() => {
    // Fetch Supabase user session and profile
    const fetchUser = async () => {
      let userId = user?.sub || user?.id
      console.log('=== LAYOUT DEBUG ===')
      console.log('AuthContext user:', user)
      console.log('AuthContext user keys:', user ? Object.keys(user) : 'No user')
      console.log('Fetching Supabase profile for user ID:', userId)
      
      if (!userId) {
        console.log('No user ID found, skipping Supabase fetch')
        return
      }
      
      try {
        // Fetch by user ID (more reliable than email)
        console.log('Fetching by user ID:', userId)
        const { data: profile, error } = await supabase
          .from('users')
          .select('first_name, middle_name, last_name, full_name, preferred_name, subscription_plan, email')
          .eq('id', userId)
          .single()
        
        console.log('ID query result:', profile)
        console.log('ID query error:', error)
        
        setSupabaseProfile(profile)
        if (profile?.subscription_plan) {
          console.log('Setting subscription plan:', profile.subscription_plan)
          setSubscriptionPlan(profile.subscription_plan)
        } else {
          console.log('No subscription plan found, defaulting to Free Plan')
          setSubscriptionPlan('Free Plan')
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setSubscriptionPlan('Free Plan')
      }
    }
    fetchUser()
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Build display name from first, middle, last name components
  const buildDisplayName = (profile) => {
    if (!profile) return null
    
    const nameParts = [
      profile.first_name,
      profile.middle_name,
      profile.last_name
    ].filter(part => part && part.trim())
    
    if (nameParts.length > 0) {
      return nameParts.join(' ')
    }
    
    // Fallback to full_name field
    return profile.full_name
  }

  // Prefer preferred_name, then full_name, then first/last, then email
  const displayName =
    supabaseProfile?.preferred_name ||
    supabaseProfile?.full_name ||
    [supabaseProfile?.first_name, supabaseProfile?.last_name].filter(Boolean).join(' ') ||
    user?.preferred_name ||
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email?.split('@')[0] ||
    null
  
  console.log('=== DISPLAY NAME DEBUG ===')
  console.log('supabaseProfile?.preferred_name:', supabaseProfile?.preferred_name)
  console.log('supabaseProfile?.full_name:', supabaseProfile?.full_name)
  console.log('user?.email:', user?.email)
  console.log('Final displayName:', displayName)
  const initials = getInitials(displayName)
  const gradientColors = getGradientColors(displayName)

  // Plan-based feature access
  const planKey = (subscriptionPlan || 'free').toLowerCase().replace(' plan', '')
  const currentAccess = planAccess[planKey] || planAccess.free

  // Navigation items with access control
  const navigation = [
    { name: 'Dashboard', href: '/app', icon: HomeIcon, always: true },
    { name: 'Budgeting', href: '/app/budgeting', icon: CalculatorIcon, access: 'budgeting' },
    { name: 'Debt Tracker', href: '/app/debt-tracker', icon: DocumentTextIcon, access: 'budgeting' },
    { name: 'AI Chat', href: '/app/chat', icon: ChatBubbleLeftRightIcon, access: 'aiChat' },
    { name: 'Credit Analysis', href: '/app/analysis', icon: ChartBarIcon, access: 'analysis' },
    { name: 'Credit Simulator', href: '/app/simulator', icon: SparklesIcon, access: 'analysis' },
    { name: 'Disputes', href: '/app/disputes', icon: DocumentTextIcon, access: 'disputes' },
    { name: 'Profile', href: '/app/profile', icon: UserIcon, always: true },
  ]
  const filteredNavigation = navigation.filter(item => item.always || currentAccess[item.access])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-300 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />
      
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ease-in-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0 lg:shadow-none`}
        aria-label="Sidebar"
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img src="/gritscore.png" alt="GritScore.ai" className="h-8 w-8" />
            <span className="font-bold text-xl text-gray-900 dark:text-white">GritScore</span>
          </div>
          {/* Close button for mobile */}
          <button 
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            onClick={() => setSidebarOpen(false)} 
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Main Navigation
            </h3>
          </div>
          
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
                tabIndex={sidebarOpen || window.innerWidth >= 1024 ? 0 : -1}
              >
                <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                }`} />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 bg-gradient-to-r ${gradientColors} rounded-full flex items-center justify-center`}>
              <span className="text-white font-semibold text-xs">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {subscriptionPlan}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* User menu for larger screens */}
              {displayName && (
                <div className="hidden lg:flex items-center space-x-3">
                  <Link to="/app/profile" className="flex items-center space-x-3 group cursor-pointer">
                    <div className={`w-8 h-8 bg-gradient-to-r ${gradientColors} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-semibold text-xs">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:underline">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {subscriptionPlan}
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 