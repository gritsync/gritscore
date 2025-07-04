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
  ShieldCheckIcon
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
  const priorities = ['high', 'medium', 'low']
  const statuses = ['pending', 'in_progress', 'resolved', 'rejected']

  useEffect(() => {
    async function fetchCreditDetails() {
      try {
        const { data } = await creditAPI.getCreditDetails();
        setCreditDetails(data.details || []);
      } catch (e) {
        setCreditDetails([]);
      }
    }
    fetchCreditDetails();
  }, []);

  // Helper to check if profile is complete
  const isProfileComplete = (profileObj) => {
    return [
      profileObj.first_name,
      profileObj.last_name,
      profileObj.address,
      profileObj.city,
      profileObj.state,
      profileObj.zip,
      profileObj.phone,
      profileObj.email
    ].every(val => val && val.trim() !== '')
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await profileAPI.getProfile()
        setProfile(data)
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
        setShowProfileModal(!isProfileComplete(data))
      } catch (e) {
        setShowProfileModal(true)
      }
    }
    fetchProfile()
  }, [])

  // Helper to flatten disputable items from structured credit details
  function extractDisputableItems(details) {
    const items = [];
    details.forEach((report, idx) => {
      // Accounts
      if (Array.isArray(report.accounts)) {
        report.accounts.forEach(acc => {
          items.push({
            type: 'Account',
            name: acc.name,
            accountType: acc.type,
            accountNumber: acc.account_number,
            status: acc.status,
            balance: acc.balance,
            negative: false,
            raw: acc
          })
          // Negative items in account
          if (Array.isArray(acc.negative_items)) {
            acc.negative_items.forEach(neg => {
              items.push({
                type: 'Negative Item',
                name: acc.name,
                accountType: acc.type,
                accountNumber: acc.account_number,
                status: acc.status,
                balance: acc.balance,
                negative: true,
                negType: neg.type,
                negDate: neg.date,
                negAmount: neg.amount,
                raw: acc
              })
            })
          }
        })
      }
      // Collections
      if (Array.isArray(report.collections)) {
        report.collections.forEach(col => {
          items.push({
            type: 'Collection',
            name: col.name,
            accountNumber: col.account_number,
            status: col.status,
            balance: col.amount,
            dateReported: col.date_reported,
            negative: true,
            raw: col
          })
        })
      }
      // Public Records
      if (Array.isArray(report.public_records)) {
        report.public_records.forEach(pub => {
          items.push({
            type: 'Public Record',
            name: pub.type,
            status: pub.status,
            dateFiled: pub.date_filed,
            negative: true,
            raw: pub
          })
        })
      }
    })
    return items
  }

  const disputableItems = extractDisputableItems(creditDetails)

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value })
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    try {
      await profileAPI.updateProfile(profileForm)
      setProfile({ ...profile, ...profileForm })
      setShowProfileModal(!isProfileComplete({ ...profile, ...profileForm }))
      toast.success('Profile info saved!')
    } catch (err) {
      toast.error('Failed to save profile info')
    }
  }

  // Download letter as PDF (letter only)
  const handleDownloadLetter = (dispute) => {
    const doc = new jsPDF()
    doc.setFontSize(12)
    const letterLines = doc.splitTextToSize(dispute.letter_text || '', 180)
    doc.text(letterLines, 10, 20)
    doc.save(`dispute_letter_${dispute.id || 'new'}.pdf`)
  }

  if (isLoading) return <div>Loading...</div>

  // Show login prompt if authentication error
  if (error?.response?.status === 401) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">
            Please log in to access your disputes.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit Disputes</h1>
          <p className="text-gray-600 mt-2">
            Challenge inaccurate information on your credit reports with AI-generated dispute letters
          </p>
        </div>
        <button
          onClick={() => setShowNewDispute(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Dispute
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {disputeStats?.pending || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {disputeStats?.in_progress || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {disputeStats?.resolved || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{disputeStats?.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disputable Items Table */}
      {disputableItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Disputable Items (Extracted from Credit Details)</h2>
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr>
                <th className="px-2 py-1 border-b text-left text-xs font-medium text-gray-700">Type</th>
                <th className="px-2 py-1 border-b text-left text-xs font-medium text-gray-700">Name</th>
                <th className="px-2 py-1 border-b text-left text-xs font-medium text-gray-700">Status</th>
                <th className="px-2 py-1 border-b text-left text-xs font-medium text-gray-700">Balance</th>
                <th className="px-2 py-1 border-b text-left text-xs font-medium text-gray-700">Details</th>
                <th className="px-2 py-1 border-b text-left text-xs font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {disputableItems.map((item, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="px-2 py-1 text-xs text-gray-800">{item.type}</td>
                  <td className="px-2 py-1 text-xs text-gray-800">{item.name}</td>
                  <td className="px-2 py-1 text-xs text-gray-800">{item.status || '-'}</td>
                  <td className="px-2 py-1 text-xs text-gray-800">{item.balance !== undefined ? item.balance : '-'}</td>
                  <td className="px-2 py-1 text-xs text-gray-600 whitespace-pre-wrap max-w-xs break-words">
                    {item.negative && item.negType ? `${item.negType} (${item.negDate || ''})` : ''}
                    {item.dateReported ? `Reported: ${item.dateReported}` : ''}
                    {item.dateFiled ? `Filed: ${item.dateFiled}` : ''}
                  </td>
                  <td className="px-2 py-1">
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                      onClick={() => setNewDispute({ ...newDispute, item: item.name, reason: '', bureau: '', priority: 'medium', status: 'pending' }) || setShowNewDispute(true)}
                    >
                      Start Dispute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Dispute Modal */}
      {showNewDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Dispute</h2>
              <button
                onClick={() => setShowNewDispute(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddDispute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Report</label>
                <select
                  value={newDispute.crdt_report_id}
                  onChange={(e) => setNewDispute({...newDispute, crdt_report_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Credit Report (Optional)</option>
                  {creditReports.map(report => (
                    <option key={report.id} value={report.id}>
                      {report.bureau} - {report.score}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item to Dispute *</label>
                <input
                  type="text"
                  value={newDispute.item}
                  onChange={(e) => setNewDispute({...newDispute, item: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Late payment on credit card"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Dispute *</label>
                <textarea
                  value={newDispute.reason}
                  onChange={(e) => setNewDispute({...newDispute, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain why this item is incorrect..."
                  rows="3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Bureau</label>
                  <select
                    value={newDispute.bureau}
                    onChange={(e) => setNewDispute({...newDispute, bureau: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Bureau</option>
                    {bureaus.map(bureau => (
                      <option key={bureau} value={bureau}>{bureau}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newDispute.priority}
                    onChange={(e) => setNewDispute({...newDispute, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewDispute(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDisputeMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {addDisputeMutation.isLoading ? 'Adding...' : 'Add Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Letter Modal */}
      {showLetterModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Dispute Letter</h2>
              <button
                onClick={() => setShowLetterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Dispute Details</h3>
                <p><strong>Item:</strong> {selectedDispute.item}</p>
                <p><strong>Reason:</strong> {selectedDispute.reason}</p>
                <p><strong>Bureau:</strong> {selectedDispute.bureau}</p>
                <p><strong>Priority:</strong> {selectedDispute.priority}</p>
              </div>
              
              {selectedDispute.letter_text ? (
                <div>
                  <h3 className="font-semibold mb-2">Generated Letter</h3>
                  <div className="bg-white border border-gray-300 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedDispute.letter_text}
                  </div>
                  <div className="flex justify-end mt-4 space-x-2">
                    <button
                      onClick={() => handleDownloadLetter(selectedDispute)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download Letter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No dispute letter generated yet.</p>
                  <button
                    onClick={() => handleGenerateLetter(selectedDispute.id)}
                    disabled={generateLetterMutation.isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center mx-auto"
                  >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    {generateLetterMutation.isLoading ? 'Generating...' : 'Generate Letter'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Info Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                You need to complete your profile information to start creating disputes. This information will be used to generate professional dispute letters on your behalf.
              </p>
            </div>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" name="first_name" value={profileForm.first_name} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input type="text" name="middle_name" value={profileForm.middle_name} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" name="last_name" value={profileForm.last_name} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" name="address" value={profileForm.address} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" name="city" value={profileForm.city} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input type="text" name="state" value={profileForm.state} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                  <input type="text" name="zip" value={profileForm.zip} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" name="phone" value={profileForm.phone} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disputes List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Disputes</h2>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading disputes...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes yet</h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first dispute to challenge inaccurate credit information.
            </p>
            <button
              onClick={() => setShowNewDispute(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Dispute
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(dispute.status)}
                      <h3 className="text-lg font-medium text-gray-900">{dispute.item}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
                        {dispute.priority}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{dispute.reason}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {dispute.bureau && (
                        <span>Bureau: {dispute.bureau}</span>
                      )}
                      <span>Created: {new Date(dispute.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <select
                      value={dispute.status}
                      onChange={(e) => handleStatusChange(dispute.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => handleViewLetter(dispute)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                      title="View Letter"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDownloadLetter(dispute)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                      title="Download Letter"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => setDeleteModal({ open: true, disputeId: dispute.id, input: '' })}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete Dispute"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-red-700">Confirm Deletion</h2>
            <p className="mb-4">To confirm deletion, type <span className="font-bold">DELETE</span> below. This action cannot be undone.</p>
            <input
              type="text"
              value={deleteModal.input}
              onChange={e => setDeleteModal({ ...deleteModal, input: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              placeholder="Type DELETE to confirm"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteModal({ open: false, disputeId: null, input: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteModal.input === 'DELETE') {
                    deleteDisputeMutation.mutate(deleteModal.disputeId);
                    setDeleteModal({ open: false, disputeId: null, input: '' });
                  }
                }}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ${deleteModal.input !== 'DELETE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={deleteModal.input !== 'DELETE'}
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

export default function DisputesProtected() {
  return <ProtectedRoute vipOnly={true}><Disputes /></ProtectedRoute>
} 