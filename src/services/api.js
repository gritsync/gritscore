import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    console.log('=== API REQUEST DEBUG ===')
    console.log('URL:', config.url)
    console.log('Token from localStorage:', token ? token.substring(0, 50) + '...' : 'No token')
    console.log('Existing Authorization header:', config.headers.Authorization)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('Set Authorization header:', config.headers.Authorization.substring(0, 50) + '...')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if it's an auth-related endpoint
      const authEndpoints = ['/auth/login', '/auth/register', '/auth/me', '/auth/profile']
      const isAuthEndpoint = authEndpoints.some(endpoint => error.config.url.includes(endpoint))
      
      if (isAuthEndpoint) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else {
        // For other endpoints, just reject the promise and let the component handle it
        console.warn('Authentication required for:', error.config.url)
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  // refresh: () => api.post('/auth/refresh'), // Not implemented
  // logout: () => api.post('/auth/logout'), // Not implemented
}

// Credit Analysis API
export const creditAPI = {
  uploadReport: (formData) => api.post('/crdt/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadImages: (formData) => api.post('/crdt/upload-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  readInfo: () => api.post('/crdt/read-info'),
  getCreditDetails: () => api.get('/crdt/credit-details'),
  getAnalysis: (analysisId) => analysisId ? api.get(`/crdt/analysis/${analysisId}`) : api.get('/crdt/analysis'),
  getAnalyses: () => api.get('/crdt/analyses'),
  getReports: () => api.get('/crdt/reports'),
  addReport: (reportData) => api.post('/crdt/reports', reportData),
  updateReport: (id, reportData) => api.put(`/crdt/reports/${id}`, reportData),
  deleteReport: (id) => api.delete(`/crdt/reports/${id}`),
  getAlerts: () => api.get('/crdt/alerts'),
  addAlert: (alertData) => api.post('/crdt/alerts', alertData),
  updateAlert: (id, alertData) => api.put(`/crdt/alerts/${id}`, alertData),
  deleteAlert: (id) => api.delete(`/crdt/alerts/${id}`),
  refreshScores: () => api.post('/crdt/refresh-scores'),
  generateDisputes: (analysisData) => api.post('/crdt/generate-disputes', analysisData),
  downloadPDF: (reportId) => api.get(`/crdt/download/${reportId}`, {
    responseType: 'blob'
  }),
  readInfoWithTimeout: (data = {}) => api.post('/crdt/read-info', data, { timeout: 120000 }),
  analyzeAndSave: (analysisData = {}) => api.post('/crdt/analyze-and-save', analysisData),
  downloadAnalysis: () => api.get('/crdt/download-analysis', { responseType: 'blob' }),
  clearData: () => api.post('/crdt/clear-data'),
  getAnalysisById: (id) => api.get(`/crdt/analysis/${id}`),
}

// AI Chat API
export const chatAPI = {
  sendMessage: (message) => api.post('/chat/send', { message }),
  getHistory: () => api.get('/chat/history'),
  clearHistory: () => api.delete('/chat/history'),
  getFinancialSummary: () => api.get('/chat/financial-summary'),
  testOpenAI: () => api.get('/chat/test-openai'),
}

// Budgeting API
export const budgetAPI = {
  getBudgets: () => api.get('/budget/budgets'),
  addBudget: (budget) => api.post('/budget/budgets', budget),
  updateBudget: (id, budget) => api.put(`/budget/budgets/${id}`, budget),
  deleteBudget: (id) => api.delete(`/budget/budgets/${id}`),

  getTransactions: () => api.get('/budget/transactions'),
  addTransaction: (tx) => api.post('/budget/transactions', tx),
  updateTransaction: (id, tx) => api.put(`/budget/transactions/${id}`, tx),
  deleteTransaction: (id) => api.delete(`/budget/transactions/${id}`),

  getCategories: () => api.get('/budget/categories'),
  addCategory: (cat) => api.post('/budget/categories', cat),
  updateCategory: (id, cat) => api.put(`/budget/categories/${id}`, cat),
  deleteCategory: (id) => api.delete(`/budget/categories/${id}`),

  // Debt Tracking API
  getDebts: () => api.get('/budget/debts'),
  addDebt: (debt) => api.post('/budget/debts', debt),
  updateDebt: (id, debt) => api.put(`/budget/debts/${id}`, debt),
  deleteDebt: (id) => api.delete(`/budget/debts/${id}`),
  updatePaymentStatus: (id, paymentData) => api.put(`/budget/debts/${id}/payment-status`, paymentData),
  getPendingDebtTransactions: (month, year) => api.get(`/budget/debts/pending-transactions?month=${month}&year=${year}`),
  syncDebtTransactions: (data) => api.post('/budget/debts/sync-transactions', data),
}

// Disputes API
export const disputeAPI = {
  getDisputes: () => api.get('/disputes'),
  addDispute: (disputeData) => api.post('/disputes', disputeData),
  updateDispute: (id, updates) => api.put(`/disputes/${id}`, updates),
  deleteDispute: (id) => api.delete(`/disputes/${id}`),
  generateLetter: (disputeId) => api.post(`/disputes/${disputeId}/letter`),
  getStats: () => api.get('/disputes/stats'),
}

// User Profile API
export const profileAPI = {
  getProfile: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
}

// Subscription API
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription/plans'),
  getCurrentPlan: () => api.get('/subscription/current'),
  createCheckoutSession: (planId) => api.post('/subscription/checkout', { planId }),
  cancelSubscription: () => api.post('/subscription/cancel'),
  updatePlan: (plan) => api.post('/subscription/update-plan', { plan }),
}

// ML API
export const mlAPI = {
  simulateScore: (data) => api.post('/ml/simulate-score', data),
  detectAnomalies: (data) => api.post('/ml/detect-anomalies', data),
  getRecommendations: (data) => api.post('/ml/recommendations', data),
  healthCheck: () => api.get('/ml/health'),
}

// Credit Details Summary API
export const creditDetailsAPI = {
  getSummary: () => api.get('/crdt/credit-details-summary'),
};

export async function deleteAnalyzedReport(id) {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const res = await fetch(`${apiUrl}/crdt/analysis/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error('Failed to delete analyzed report');
  return res.json();
}

export async function clearAnalyzedReports() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const res = await fetch(`${apiUrl}/crdt/analyses`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error('Failed to clear analyzed reports');
  return res.json();
}

export default api 