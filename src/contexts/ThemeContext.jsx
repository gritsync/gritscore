import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const themes = {
  white: {
    name: 'White',
    primary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    accent: '#3b82f6',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    border: '#e2e8f0'
  },
  dark: {
    name: 'Dark',
    primary: {
      50: '#0f172a',
      100: '#1e293b',
      200: '#334155',
      300: '#475569',
      400: '#64748b',
      500: '#94a3b8',
      600: '#cbd5e1',
      700: '#e2e8f0',
      800: '#f1f5f9',
      900: '#f8fafc',
    },
    accent: '#60a5fa',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    border: '#334155'
  },
  gray: {
    name: 'Gray',
    primary: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    accent: '#6b7280',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    border: '#e5e7eb'
  },
  blue: {
    name: 'Blue',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: '#3b82f6',
    background: '#eff6ff',
    surface: '#ffffff',
    text: '#1e3a8a',
    border: '#bfdbfe'
  },
  red: {
    name: 'Red',
    primary: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    accent: '#ef4444',
    background: '#fef2f2',
    surface: '#ffffff',
    text: '#7f1d1d',
    border: '#fecaca'
  },
  pink: {
    name: 'Pink',
    primary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
    },
    accent: '#ec4899',
    background: '#fdf2f8',
    surface: '#ffffff',
    text: '#831843',
    border: '#fbcfe8'
  },
  green: {
    name: 'Green',
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    accent: '#22c55e',
    background: '#f0fdf4',
    surface: '#ffffff',
    text: '#14532d',
    border: '#bbf7d0'
  },
  purple: {
    name: 'Purple',
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    accent: '#a855f7',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#581c87',
    border: '#e9d5ff'
  },
  orange: {
    name: 'Orange',
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    accent: '#f97316',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#7c2d12',
    border: '#fed7aa'
  }
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('blue')
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('selectedTheme')
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    const theme = themes[currentTheme]
    if (theme) {
      const root = document.documentElement
      
      // Apply CSS custom properties
      Object.entries(theme.primary).forEach(([key, value]) => {
        root.style.setProperty(`--color-primary-${key}`, value)
      })
      
      root.style.setProperty('--color-accent', theme.accent)
      root.style.setProperty('--color-background', theme.background)
      root.style.setProperty('--color-surface', theme.surface)
      root.style.setProperty('--color-text', theme.text)
      root.style.setProperty('--color-border', theme.border)
      
      // Save to localStorage
      localStorage.setItem('selectedTheme', currentTheme)
    }
  }, [currentTheme])

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName)
      setIsThemeMenuOpen(false)
    }
  }

  const value = {
    currentTheme,
    changeTheme,
    isThemeMenuOpen,
    setIsThemeMenuOpen,
    themes
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
} 