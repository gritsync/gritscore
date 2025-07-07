// Environment configuration
const config = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || '/api',
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  
  // App Configuration
  APP_URL: import.meta.env.VITE_APP_URL || window.location.origin,
  
  // Environment
  NODE_ENV: import.meta.env.MODE,
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
}

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY'
]

const missingEnvVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar])

if (missingEnvVars.length > 0 && config.IS_PRODUCTION) {
  console.warn('Missing environment variables:', missingEnvVars)
}

export default config 