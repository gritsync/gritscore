import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { budgetAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../services/supabase'

const DebtTracker = () => {
  const { user } = useAuth()
  const [debts, setDebts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentStatusLoading, setPaymentStatusLoading] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(7)
  const [selectedYear, setSelectedYear] = useState(2025)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [showEditDebt, setShowEditDebt] = useState(false)
  const [showDeleteDebt, setShowDeleteDebt] = useState(false)
  const [showViewDebt, setShowViewDebt] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [modalYear, setModalYear] = useState(2025)
  const [editInModal, setEditInModal] = useState(false)
  const [editDebtData, setEditDebtData] = useState(null)
  const [transactionsLoaded, setTransactionsLoaded] = useState(false)

  // Fetch debts and transactions on mount
  useEffect(() => {
    fetchDebts()
    fetchTransactions()
  }, [])

  const fetchDebts = async () => {
    setLoading(true)
    try {
      const response = await budgetAPI.getDebts()
      setDebts(response.data || [])
    } catch (error) {
      console.error('Error fetching debts:', error)
      toast.error('Failed to load debt data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      // Fetch directly from Supabase for better performance
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
      
      if (error) {
        console.error('Error fetching transactions from Supabase:', error)
        // Fallback to API
        const response = await budgetAPI.getTransactions()
        const transactionsData = response.data || []
        setTransactions(transactionsData)
      } else {
        console.log('Fetched transactions from Supabase:', transactionsData)
        setTransactions(transactionsData || [])
      }
      setTransactionsLoaded(true)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setTransactionsLoaded(true) // Mark as loaded even on error
    }
  }

  const handleAddDebt = async (e) => {
    e.preventDefault()
    try {
      await budgetAPI.addDebt(newDebt)
      toast.success('Debt added successfully!')
      setShowAddDebt(false)
      setNewDebt({
        item_name: '',
        provider: '',
        due_date: '',
        start_date: '',
        end_date: '',
        duration: '',
        original_amount: '',
        current_balance: '',
        monthly_payment: '',
        status: 'pending'
      })
      fetchDebts()
    } catch (error) {
      toast.error('Failed to add debt')
    }
  }

  const handleUpdateDebt = async (e) => {
    e.preventDefault()
    try {
      await budgetAPI.updateDebt(selectedDebt.id, selectedDebt)
      toast.success('Debt updated successfully!')
      setShowEditDebt(false)
      setSelectedDebt(null)
      fetchDebts()
    } catch (error) {
      toast.error('Failed to update debt')
    }
  }

  const handleDeleteDebt = async () => {
    try {
      await budgetAPI.deleteDebt(selectedDebt.id)
      toast.success('Debt deleted successfully!')
      setShowDeleteDebt(false)
      setSelectedDebt(null)
      fetchDebts()
    } catch (error) {
      toast.error('Failed to delete debt')
    }
  }

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Generate year options (current year - 5 to current year + 5)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  // Get payment status for a month (synchronous, with enhanced debug logging)
  const getPaymentStatus = (debt, monthIndex, year) => {
    // Find all transactions for this debt and month/year
    const candidates = transactions.filter(t => {
      const debtMatch = t.debt_id === debt.id || 
                       (t.description && t.description.toLowerCase().includes(debt.item_name.toLowerCase()));
      let txDate = t.date;
      if (typeof txDate === 'string') txDate = new Date(txDate);
      if (!(txDate instanceof Date) || isNaN(txDate)) return false;
      // UI monthIndex is 1-based, JS Date is 0-based
      const dateMatch = txDate.getMonth() === (monthIndex - 1) && txDate.getFullYear() === year;
      return debtMatch && dateMatch;
    });
    console.log('[DEBUG] getPaymentStatus candidates:', {
      debt: debt.item_name,
      debt_id: debt.id,
      monthIndex,
      year,
      candidates: candidates.map(t => ({
        id: t.id,
        debt_id: t.debt_id,
        description: t.description,
        date: t.date,
        status: t.status
      }))
    });
    const tx = candidates[0];
    if (tx) {
      console.log('[DEBUG] getPaymentStatus MATCH:', {
        debt: debt.item_name,
        monthIndex,
        year,
        tx,
        status: tx.status
      });
    }
    // Normalize status check
    return !!(tx && (typeof tx.status === 'string' ? tx.status.trim().toLowerCase() === 'paid' : tx.status === undefined));
  };

  // Check if payment status is loading for a specific month
  const isPaymentStatusLoading = (debt, monthIndex, year) => {
    const loadingKey = `${debt.id}-${monthIndex}-${year}`
    return paymentStatusLoading[loadingKey]
  }

  // Update payment status with loading state
  const updatePaymentStatusForMonthYear = async (debtId, monthIndex, year, currentStatus) => {
    const loadingKey = `${debtId}-${monthIndex}-${year}`
    setPaymentStatusLoading(prev => ({ ...prev, [loadingKey]: true }))
    
    try {
      // Find existing transaction for this debt and month/year
      const existingTx = transactions.find(t => {
        const debtMatch = t.debt_id === debtId
        const txDate = new Date(t.date)
        const dateMatch = txDate.getMonth() === (monthIndex - 1) && txDate.getFullYear() === year
        return debtMatch && dateMatch
      })

      if (existingTx) {
        // Update existing transaction status
        const newStatus = currentStatus ? 'pending' : 'paid'
        await budgetAPI.updateTransactionStatus(existingTx.id, { status: newStatus })
      } else {
        // Create new transaction for this debt payment
        const debt = debts.find(d => d.id === debtId)
        if (debt) {
          const newTransaction = {
            description: `${debt.item_name} - ${debt.provider}`,
            amount: debt.monthly_payment,
            date: new Date(year, monthIndex - 1, 15).toISOString().split('T')[0],
            debt_id: debtId,
            status: 'paid'
          }
          await budgetAPI.addTransaction(newTransaction)
        }
      }
      
      // Refresh data
      await fetchTransactions()
      await fetchDebts()
      toast.success('Payment status updated successfully')
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    } finally {
      setPaymentStatusLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Debt Tracker</h1>
          <p className="mt-1 text-sm text-theme-primary">
            Track your debt payments and payment history
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddDebt(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Debt
          </button>
        </div>
      </div>

      {/* Month and Year Selectors */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-theme-text">Payment History</h3>
          <div className="flex items-center gap-4">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMonth(prev => prev === 1 ? 12 : prev - 1)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Previous Month"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedMonth(prev => prev === 12 ? 1 : prev + 1)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Next Month"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Previous Year"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedYear(prev => prev + 1)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Next Year"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-theme-primary mt-2">
          Viewing payment status for {monthNames[selectedMonth - 1]} {selectedYear}. 
          Payment status is based on transactions in Budgeting with matching debt and date.
        </p>
      </div>

      {/* Debts Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-theme-primary mt-2">Loading debts...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Payment
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {debts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No debts found. Add your first debt to start tracking.
                    </td>
                  </tr>
                ) : (
                  debts.map((debt) => {
                    const paymentStatus = getPaymentStatus(debt, selectedMonth, selectedYear)
                    return (
                      <tr key={debt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {debt.item_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {debt.provider}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {debt.due_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          ${debt.monthly_payment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              debt.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {debt.status.charAt(0).toUpperCase() + debt.status.slice(1)}
                            </span>
                            {debt.status === 'pending' && debt.duration && (
                              <span className="text-xs text-gray-500">
                                {(() => {
                                  try {
                                    const durationMatch = debt.duration.match(/(\d+)\s*months?/i)
                                    if (durationMatch) {
                                      const totalMonths = parseInt(durationMatch[1])
                                      let paidMonths = 0
                                      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
                                      
                                      if (debt.payment_status) {
                                        for (const year in debt.payment_status) {
                                          if (typeof debt.payment_status[year] === 'object') {
                                            for (const month of monthNames) {
                                              if (debt.payment_status[year][month]) {
                                                paidMonths++
                                              }
                                            }
                                          }
                                        }
                                      }
                                      
                                      const percentage = Math.round((paidMonths / totalMonths) * 100)
                                      return `${paidMonths}/${totalMonths} (${percentage}%)`
                                    }
                                    return ''
                                  } catch (e) {
                                    return ''
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            {selectedMonth === (new Date().getMonth() + 1) && selectedYear === new Date().getFullYear() ? (
                              <span
                                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                                  paymentStatus
                                    ? 'bg-green-500 text-white'
                                    : 'bg-red-500 text-white'
                                }`}
                                title={paymentStatus ? 'Paid - Edit in Budgeting' : 'Not paid - Edit in Budgeting'}
                              >
                                {paymentStatus ? '✓' : '✗'}
                              </span>
                            ) : (
                              <button
                                onClick={() => updatePaymentStatusForMonthYear(debt.id, selectedMonth, selectedYear, paymentStatus)}
                                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                                  paymentStatus
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                                title={paymentStatus ? 'Mark as unpaid' : 'Mark as paid'}
                              >
                                {paymentStatus ? '✓' : '✗'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                setSelectedDebt(debt)
                                setModalYear(new Date().getFullYear())
                                setShowViewDebt(true)
                              }}
                              className="bg-blue-500 hover:bg-blue-700 text-white rounded-full p-2 transition-all shadow-md"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Debt Modal */}
      {showAddDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Debt</h3>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={newDebt.item_name}
                  onChange={(e) => setNewDebt({...newDebt, item_name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={newDebt.provider}
                  onChange={(e) => setNewDebt({...newDebt, provider: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDebt.due_date}
                    onChange={(e) => setNewDebt({...newDebt, due_date: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                  <input
                    type="number"
                    value={newDebt.monthly_payment}
                    onChange={(e) => setNewDebt({...newDebt, monthly_payment: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newDebt.start_date}
                    onChange={(e) => setNewDebt({...newDebt, start_date: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newDebt.end_date}
                    onChange={(e) => setNewDebt({...newDebt, end_date: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={newDebt.duration}
                    onChange={(e) => setNewDebt({...newDebt, duration: e.target.value})}
                    className="input-field"
                    placeholder="e.g., 12 months"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Amount</label>
                  <input
                    type="number"
                    value={newDebt.original_amount}
                    onChange={(e) => setNewDebt({...newDebt, original_amount: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
                <input
                  type="number"
                  value={newDebt.current_balance}
                  onChange={(e) => setNewDebt({...newDebt, current_balance: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDebt(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Debt Modal */}
      {showEditDebt && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Debt</h3>
            <form onSubmit={handleUpdateDebt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={selectedDebt.item_name}
                  onChange={(e) => setSelectedDebt({...selectedDebt, item_name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={selectedDebt.provider}
                  onChange={(e) => setSelectedDebt({...selectedDebt, provider: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={selectedDebt.due_date}
                    onChange={(e) => setSelectedDebt({...selectedDebt, due_date: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                  <input
                    type="number"
                    value={selectedDebt.monthly_payment}
                    onChange={(e) => setSelectedDebt({...selectedDebt, monthly_payment: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={selectedDebt.start_date}
                    onChange={(e) => setSelectedDebt({...selectedDebt, start_date: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={selectedDebt.end_date}
                    onChange={(e) => setSelectedDebt({...selectedDebt, end_date: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={selectedDebt.duration}
                    onChange={(e) => setSelectedDebt({...selectedDebt, duration: e.target.value})}
                    className="input-field"
                    placeholder="e.g., 12 months"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Amount</label>
                  <input
                    type="number"
                    value={selectedDebt.original_amount}
                    onChange={(e) => setSelectedDebt({...selectedDebt, original_amount: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
                <input
                  type="number"
                  value={selectedDebt.current_balance}
                  onChange={(e) => setSelectedDebt({...selectedDebt, current_balance: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditDebt(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Debt Modal */}
      {showViewDebt && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-1 w-full max-w-3xl shadow-2xl mx-2">
            <div className="bg-white rounded-2xl p-8 w-full flex flex-col md:flex-row gap-8">
              {/* Left: Debt Info or Edit Form */}
              <div className="flex-1 space-y-4">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center md:text-left">Debt Details</h2>
                {editInModal ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      try {
                        await budgetAPI.updateDebt(selectedDebt.id, editDebtData)
                        toast.success('Debt updated successfully!')
                        setEditInModal(false)
                        setShowEditDebt(false)
                        setSelectedDebt({ ...selectedDebt, ...editDebtData })
                        fetchDebts()
                      } catch (error) {
                        toast.error('Failed to update debt')
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Item Name</label>
                        <input
                          type="text"
                          value={editDebtData.item_name}
                          onChange={e => setEditDebtData({ ...editDebtData, item_name: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Provider</label>
                        <input
                          type="text"
                          value={editDebtData.provider}
                          onChange={e => setEditDebtData({ ...editDebtData, provider: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Due Date</label>
                        <input
                          type="date"
                          value={editDebtData.due_date}
                          onChange={e => setEditDebtData({ ...editDebtData, due_date: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Monthly Payment</label>
                        <input
                          type="number"
                          value={editDebtData.monthly_payment}
                          onChange={e => setEditDebtData({ ...editDebtData, monthly_payment: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editDebtData.start_date || ''}
                          onChange={e => setEditDebtData({ ...editDebtData, start_date: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          value={editDebtData.end_date || ''}
                          onChange={e => setEditDebtData({ ...editDebtData, end_date: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Duration</label>
                        <input
                          type="text"
                          value={editDebtData.duration || ''}
                          onChange={e => setEditDebtData({ ...editDebtData, duration: e.target.value })}
                          className="input-field"
                          placeholder="e.g., 12 months"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Original Amount</label>
                        <input
                          type="number"
                          value={editDebtData.original_amount || ''}
                          onChange={e => setEditDebtData({ ...editDebtData, original_amount: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Current Balance</label>
                        <input
                          type="number"
                          value={editDebtData.current_balance || ''}
                          onChange={e => setEditDebtData({ ...editDebtData, current_balance: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                        <select
                          value={editDebtData.status}
                          onChange={e => setEditDebtData({ ...editDebtData, status: e.target.value })}
                          className="input-field"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditInModal(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Item Name</span>
                      <span className="block text-lg font-medium text-gray-800">{selectedDebt.item_name}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Provider</span>
                      <span className="block text-lg font-medium text-gray-800">{selectedDebt.provider}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Due Date</span>
                      <span className="block text-lg font-medium text-gray-800">{selectedDebt.due_date}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Monthly Payment</span>
                      <span className="block text-lg font-medium text-gray-800">${selectedDebt.monthly_payment}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Start Date</span>
                      <span className="block text-lg font-medium text-gray-800">{selectedDebt.start_date || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">End Date</span>
                      <span className="block text-lg font-medium text-gray-800">{selectedDebt.end_date || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Duration</span>
                      <span className="block text-lg font-medium text-gray-800">{selectedDebt.duration || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Original Amount</span>
                      <span className="block text-lg font-medium text-gray-800">${selectedDebt.original_amount || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Current Balance</span>
                      <span className="block text-lg font-medium text-gray-800">${selectedDebt.current_balance || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Status</span>
                      <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                        selectedDebt.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedDebt.status.charAt(0).toUpperCase() + selectedDebt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Right: Months Paid */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-base font-semibold text-gray-700 mb-2">Monthly Payment Status</span>
                <p className="text-xs text-gray-500 mb-3 text-center">Click on months to toggle payment status</p>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Year:</span>
                  <select
                    value={modalYear}
                    onChange={e => setModalYear(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {Array.from({ length: 41 }, (_, i) => (new Date().getFullYear() - 10 + i)).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {!transactionsLoaded ? (
                  <div className="flex items-center justify-center w-full h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading payment data...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 justify-center">
                    {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map((month, idx) => {
                      const monthIndex = idx + 1; // Convert to 1-12 format
                      const isLoading = isPaymentStatusLoading(selectedDebt, monthIndex, parseInt(modalYear));
                      const isPaid = getPaymentStatus(selectedDebt, monthIndex, parseInt(modalYear));
                      
                      // Find the transaction for this month to get payment date
                      const transaction = transactions.find(t => {
                        const debtMatch = t.debt_id === selectedDebt.id || 
                                         (t.description && t.description.toLowerCase().includes(selectedDebt.item_name.toLowerCase()));
                        const txDate = new Date(t.date);
                        const dateMatch = txDate.getMonth() === (monthIndex - 1) && txDate.getFullYear() === parseInt(modalYear);
                        return debtMatch && dateMatch;
                      });
                      
                      const paymentDate = transaction ? new Date(transaction.date).toLocaleDateString() : null;
                      
                      return (
                        <div
                          key={month}
                          className={`flex flex-col items-center w-16 h-16 rounded-xl shadow-md bg-gradient-to-br ${
                            isLoading ? 'from-blue-200 to-blue-400' :
                            isPaid ? 'from-green-400 to-green-600' : 'from-gray-200 to-gray-300'
                          } justify-center transition-all group relative cursor-pointer hover:scale-105`}
                          onClick={() => !isLoading && updatePaymentStatusForMonthYear(selectedDebt.id, monthIndex, parseInt(modalYear), isPaid)}
                        >
                          <span className="font-bold text-sm text-white drop-shadow-sm">{month}</span>
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          ) : (
                            <span className={`text-2xl font-bold ${isPaid ? 'text-green-200' : 'text-red-500'} transition-all duration-200`}>
                              {isPaid ? '✔' : '✗'}
                            </span>
                          )}
                          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                            {isLoading ? 'Loading...' : 
                             isPaid ? (paymentDate ? `Paid on ${paymentDate}` : 'Paid') : 'Click to mark as paid'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-end items-center gap-4 pt-6">
              <button
                onClick={() => {
                  setEditDebtData(selectedDebt)
                  setEditInModal(true)
                }}
                disabled={!selectedDebt}
                className={`btn-primary text-lg px-6 py-2 rounded-xl shadow-md transition-opacity ${!selectedDebt ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteDebt(true)}
                disabled={!selectedDebt}
                className={`bg-red-600 hover:bg-red-700 text-white text-lg px-6 py-2 rounded-xl shadow-md transition-opacity ${!selectedDebt ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Delete
              </button>
              <button
                onClick={() => setShowViewDebt(false)}
                className="btn-secondary text-lg px-6 py-2 rounded-xl shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteDebt && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Debt</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{selectedDebt.item_name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDebt(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDebt}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DebtTracker 