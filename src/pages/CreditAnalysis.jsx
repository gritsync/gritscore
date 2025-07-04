import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DocumentArrowUpIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { creditAPI, creditDetailsAPI, deleteAnalyzedReport, clearAnalyzedReports } from '../services/api'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import AnalysisResult from './AnalysisResult'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function CreditAnalysis() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [analysisId, setAnalysisId] = useState(null)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const queryClient = useQueryClient()
  const [newReport, setNewReport] = useState({ bureau: '', score: '', report_data: {} });
  const [refreshing, setRefreshing] = useState(false);
  const [generatingDisputes, setGeneratingDisputes] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [creditDetails, setCreditDetails] = useState([]);
  const [infoExtracted, setInfoExtracted] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [autoScore, setAutoScore] = useState(false);
  const [summary, setSummary] = useState('');
  const [isReadingInfo, setIsReadingInfo] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [hasNewUploads, setHasNewUploads] = useState(false);
  const [analyzedReports, setAnalyzedReports] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'single' or 'all'
  const [reportToDelete, setReportToDelete] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [fetchingAnalyzedReports, setFetchingAnalyzedReports] = useState(false);

  const navigate = useNavigate();

  // Upload mutation
  const uploadMutation = useMutation(
    (formData) => {
      return creditAPI.uploadReport(formData)
    },
    {
      onSuccess: (data) => {
        setAnalysisId(data.analysisId)
        toast.success('Credit report uploaded successfully! Analysis in progress...')
        queryClient.invalidateQueries(['credit-analysis', data.analysisId])
        queryClient.invalidateQueries('creditReports')
        // Clear form
        setNewReport({ bureau: '', score: '', report_data: {} });
      },
      onError: (error) => {
        toast.error('Failed to upload credit report. Please try again.')
      }
    }
  )

  // Get comprehensive analysis
  const { data: comprehensiveAnalysis, isLoading: comprehensiveLoading, refetch: refetchComprehensive } = useQuery(
    'comprehensive-analysis',
    () => creditAPI.getAnalysis(),
    {
      enabled: false, // Only run when manually triggered
      staleTime: 5 * 60 * 1000
    }
  )

  // Analysis query
  const { data: analysis, isLoading: analysisLoading, refetch: refetchAnalysis } = useQuery(
    ['credit-analysis', analysisId],
    () => creditAPI.getAnalysis(analysisId),
    {
      enabled: !!analysisId,
      refetchInterval: false, // Disable auto-refetch for now
      staleTime: 5 * 60 * 1000
    }
  )

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      setUploadedFile(file)
      // Don't automatically upload when dropping - let user fill form first
      // uploadMutation.mutate(file)
    }
  })

  // Fetch credit reports
  const { data: reportsData, isLoading: reportsLoading, error } = useQuery('creditReports', creditAPI.getReports, {
    retry: false,
    onError: (error) => {
      console.error('Failed to fetch credit reports:', error);
    }
  });
  
  // Ensure reports is always an array
  const reports = Array.isArray(reportsData) ? reportsData : [];

  // Add credit report
  const addReportMutation = useMutation(creditAPI.addReport, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('creditReports');
      toast.success('AI Analyzation Completed!');
      setNewReport({ bureau: '', score: '', report_data: {} });
      setAnalysisResult(data.analysis);
    },
    onError: () => toast.error('Failed to add credit report')
  });

  // Delete credit report
  const deleteReportMutation = useMutation(creditAPI.deleteReport, {
    onSuccess: () => {
      queryClient.invalidateQueries('creditReports');
      toast.success('Credit report deleted!');
    },
    onError: () => toast.error('Failed to delete credit report')
  });

  // Generate disputes from analysis
  const generateDisputesMutation = useMutation(
    (analysisData) => creditAPI.generateDisputes(analysisData),
    {
      onSuccess: (data) => {
        toast.success(`Generated ${data.disputes.length} disputes successfully!`);
        queryClient.invalidateQueries('disputes');
      },
      onError: () => toast.error('Failed to generate disputes')
    }
  );

  // Multi-image upload handler
  const handleImageUpload = (e) => {
    setUploadedImages(Array.from(e.target.files));
    setInfoExtracted(false);
    setCreditDetails([]);
    setHasNewUploads(true); // Mark that new documents have been uploaded
  };

  // Upload images to backend
  const handleUploadImages = async () => {
    if (!uploadedImages.length) return;
    const formData = new FormData();
    uploadedImages.forEach((file) => formData.append('files', file));
    await creditAPI.uploadImages(formData);
  };

  // Read info (OCR extraction)
  const handleReadInfo = async () => {
    setIsReadingInfo(true);
    await handleUploadImages();
    try {
      await creditAPI.readInfoWithTimeout({ credit_score: scoreInput ? parseInt(scoreInput) : undefined });
    } catch (err) {
      setIsReadingInfo(false);
      toast.error('Failed to extract credit details. Please try again.');
      throw err;
    }
    const { data } = await creditAPI.getCreditDetails();
    setCreditDetails(data.details || []);
    setInfoExtracted(true);
    setAutoScore(true);
    setScoreInput(data.details[0]?.personal_info?.credit_score || '');
    setHasNewUploads(false); // Reset new uploads flag after reading info
    
    // Fetch the updated summary from keep.txt
    try {
      const summaryResponse = await creditDetailsAPI.getSummary();
      setSummary(summaryResponse.data.summary || '');
    } catch (summaryErr) {
      console.error('Failed to fetch summary:', summaryErr);
    }
    setIsReadingInfo(false);
    toast.success('Credit details extracted successfully!');
  };

  // Fetch analyzed reports from backend
  const fetchAnalyzedReports = async () => {
    setFetchingAnalyzedReports(true);
    try {
      const { data } = await creditAPI.getAnalyses();
      setAnalyzedReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setAnalyzedReports([]);
    } finally {
      setFetchingAnalyzedReports(false);
    }
  };

  // After running analysis, refetch analyzed reports
  const handleRunAIAnalysis = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAnalysisError(null);
    try {
      // Prepare analysis data including credit score from input
      const analysisData = {};
      if (scoreInput) {
        analysisData.credit_score = parseInt(scoreInput);
      }
      const response = await creditAPI.analyzeAndSave(analysisData);
      if (response.data.analysis && response.data.analysis.id) {
        setSelectedAnalysisId(response.data.analysis.id);
        setShowAnalysisModal(true);
      }
      await fetchAnalyzedReports();
      toast.success('AI Analysis completed successfully!');
    } catch (err) {
      let errorMsg = 'Failed to run AI analysis.';
      if (err?.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      setAnalysisError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // PDF download for a report
  const handleDownloadAnalyzedReportPDF = async (report) => {
    // Create a temporary div to render AnalysisResult
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    import('react-dom').then(ReactDOM => {
      ReactDOM.render(
        <AnalysisResult id={report.id} isModal={true} />, tempDiv, async () => {
          const canvas = await html2canvas(tempDiv, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pageWidth;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`credit_analysis_${report.id}.pdf`);
          ReactDOM.unmountComponentAtNode(tempDiv);
          document.body.removeChild(tempDiv);
        }
      );
    });
  };

  const handleDownloadAnalysis = async () => {
    setDownloading(true);
    try {
      const response = await creditAPI.downloadAnalysis();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'analysis_report.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      toast.error('Failed to download analysis report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleViewAnalyzedReport = (report) => {
    if (report && report.id) {
      setSelectedAnalysisId(report.id);
      setShowAnalysisModal(true);
    }
  };

  const handleClearData = async () => {
    try {
      await creditAPI.clearData();
      // Clear local state
      setCreditDetails([]);
      setInfoExtracted(false);
      setSummary('');
      setScoreInput('');
      setAutoScore(false);
      setUploadedImages([]);
      setHasNewUploads(false);
      // Note: Analyzed reports are preserved - they have their own delete functionality
      toast.success('Credit data cleared successfully! (Analyzed reports preserved)');
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear data. Please try again.');
    }
  };

  const handleClearAnalyzedReports = () => {
    setDeleteTarget('all');
    setShowDeleteModal(true);
  };

  const handleDeleteSingleReport = (report) => {
    setDeleteTarget('single');
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget === 'all') {
        await clearAnalyzedReports();
        toast.success('All analyzed reports deleted!');
      } else if (deleteTarget === 'single' && reportToDelete) {
        await deleteAnalyzedReport(reportToDelete.id);
        toast.success('Report deleted successfully!');
      }
      await fetchAnalyzedReports();
    } catch (err) {
      toast.error('Failed to delete analyzed report(s)');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setReportToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setReportToDelete(null);
  };

  const handleRefreshScores = async () => {
    setRefreshing(true);
    try {
      await creditAPI.refreshScores();
      await queryClient.invalidateQueries('creditReports');
      toast.success('Scores refreshed!');
    } catch (err) {
      toast.error('Failed to refresh scores');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      await refetchComprehensive();
      toast.success('Analysis completed!');
    } catch (error) {
      toast.error('Failed to run analysis. Please add credit reports first.');
    }
  };

  const handleGenerateDisputes = async () => {
    if (!comprehensiveAnalysis?.analysis?.dispute_opportunities) {
      toast.error('No dispute opportunities found in analysis');
      return;
    }

    setGeneratingDisputes(true);
    try {
      await generateDisputesMutation.mutateAsync({
        analysis: comprehensiveAnalysis.analysis
      });
    } finally {
      setGeneratingDisputes(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-green-600'
    if (score >= 700) return 'text-blue-600'
    if (score >= 650) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreCategory = (score) => {
    if (score >= 750) return 'Excellent'
    if (score >= 700) return 'Good'
    if (score >= 650) return 'Fair'
    return 'Poor'
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper: extract baseline score from creditDetails or fallback to scoreInput
  const getBaselineScore = () => {
    // Try to find a score in the extracted details (from .keep)
    for (const detail of creditDetails) {
      if (detail && detail.personal_info && detail.personal_info.credit_score) {
        return detail.personal_info.credit_score;
      }
      if (detail && detail.accounts && detail.accounts.length) {
        for (const acc of detail.accounts) {
          if (acc.credit_score) return acc.credit_score;
        }
      }
    }
    // If not found, use the declared scoreInput
    return scoreInput;
  };

  useEffect(() => {
    // Fetch summary from keep.txt
    creditDetailsAPI.getSummary().then(({ data }) => {
      console.log('Summary response on mount:', data);
      console.log('Summary content length on mount:', data.summary ? data.summary.length : 0);
      console.log('Summary fetched:', data.summary ? data.summary.substring(0, 100) + '...' : 'No summary');
      setSummary(data.summary || '');
    }).catch(err => {
      console.error('Failed to fetch summary:', err);
    });
    
    // Also check if credit details already exist
    creditAPI.getCreditDetails().then(({ data }) => {
      if (data?.details?.length > 0) {
        setCreditDetails(data.details);
        setInfoExtracted(true);
        // Auto-fill credit score if available
        const score = data.details[0]?.personal_info?.credit_score;
        if (score) {
          setScoreInput(score.toString());
          setAutoScore(true);
        }
      }
    }).catch(() => {
      // No credit details found, that's okay
    });
  }, []);

  // Fetch on mount and after analysis
  useEffect(() => {
    fetchAnalyzedReports();
  }, []);

  if (isLoading || isReadingInfo) return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-80">
      <div className="flex flex-col items-center">
        <span className="rainbow-spinner mb-4"></span>
        <span className="text-lg font-semibold text-indigo-700 animate-pulse">
          {isReadingInfo ? 'Reading Credit Info...' : 'Running AI Analysis...'}
        </span>
      </div>
      <style>{`
        .rainbow-spinner {
          width: 64px;
          height: 64px;
          border: 8px solid #e0e7ff;
          border-top: 8px solid #6366f1;
          border-right: 8px solid #22d3ee;
          border-bottom: 8px solid #22c55e;
          border-left: 8px solid #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 16px #6366f1, 0 0 32px #22d3ee, 0 0 48px #22c55e, 0 0 64px #f59e0b;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
  
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Credit Reports</h3>
          <p className="text-gray-600 mb-6">
            There was an error loading your credit reports. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Instructions Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
        <strong>How it works:</strong> Upload your credit report documents or images (PDF, JPG, PNG). Optionally enter your credit score, or let the system extract it automatically. Click <span className="font-semibold underline">Read Info</span> to extract your credit details before running the AI analysis. <span className="font-semibold text-red-600">Important:</span> If you upload new documents, you must click "Read Info" again before running analysis. All analyzed reports are saved and can be downloaded anytime from the "Analyzed Reports" table below.
      </div>

      {/* Table 1: Credit Reports */}
      <div className="card">
        <h2 className="text-lg font-bold mb-2">Credit Reports</h2>
        <form
          className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0"
          onSubmit={e => e.preventDefault()}
        >
          {/* File Upload */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Documents (PDF, JPG, PNG, multiple allowed)</label>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              multiple
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2"
            />
          </div>
          {/* Credit Score Input */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
            <input
              type="number"
              min="300"
              max="900"
              value={scoreInput}
              onChange={e => setScoreInput(e.target.value)}
              placeholder="Enter score"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Read Info Button */}
          <div className="flex flex-col">
            <div className="text-xs text-gray-600 mb-1">
              {hasNewUploads ? 'New documents uploaded - Read Info required' : 
               infoExtracted ? 'Info extracted successfully' : 
               'Extract credit details from documents'}
            </div>
            <button
              type="button"
              className="mt-6 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleReadInfo}
              disabled={!uploadedImages.length}
            >
              Read Info
            </button>
          </div>
          {/* Run AI Analysis Button */}
          <div className="flex flex-col">
            <div className="text-xs text-gray-600 mb-1">
              {hasNewUploads ? 'New documents uploaded - Read Info first' :
               (infoExtracted || summary || scoreInput) ? 'Ready for analysis' :
               'Upload documents, enter score, or read info'}
            </div>
            <button
              type="button"
              className={`mt-6 md:mt-0 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${(infoExtracted || summary || scoreInput) && !hasNewUploads ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              onClick={handleRunAIAnalysis}
              disabled={!(infoExtracted || summary || scoreInput) || hasNewUploads}
            >
              Run AI Analysis
            </button>
          </div>
        </form>
        {/* Uploaded files list (optional, for user feedback) */}
        {uploadedImages.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            <span>Files selected: {uploadedImages.map(f => f.name).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Table 2: Credit Details - Key Score-Affecting Information */}
      <div className="card relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Credit Details</h2>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center z-10"
            onClick={() => setShowClearModal(true)}
            title="Clear all credit data"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            Clear Data
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Key information that directly affects your credit score</p>
        
        {creditDetails.length > 0 ? (
          <div className="space-y-6">
            {/* Credit Score */}
            {creditDetails[0]?.personal_info?.credit_score && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Credit Score</h3>
                <div className="text-2xl font-bold text-blue-700">
                  {creditDetails[0].personal_info.credit_score}
                </div>
              </div>
            )}

            {/* Accounts Table */}
            {creditDetails.some(detail => detail.accounts?.length > 0) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Accounts & Balances</h3>
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Account Name</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Type</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Balance</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Credit Limit</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Utilization</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
                    {creditDetails.flatMap((detail, idx) => 
                      (detail.accounts || []).map((acc, i) => (
                        <tr key={`acc-${idx}-${i}`} className="hover:bg-gray-50"> 
                          <td className="px-3 py-2 text-sm">{acc.name || 'N/A'}</td>
                          <td className="px-3 py-2 text-sm">{acc.type || 'N/A'}</td>
                          <td className="px-3 py-2 text-sm font-medium">
                            {acc.balance ? `$${Number(acc.balance).toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {acc.credit_limit ? `$${Number(acc.credit_limit).toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {acc.utilization ? `${acc.utilization}%` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              acc.status === 'open' ? 'bg-green-100 text-green-800' :
                              acc.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              acc.status === 'collection' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {acc.status || 'N/A'}
                            </span>
                          </td>
                  </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment History */}
            {creditDetails.some(detail => detail.payment_history) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment History (35% of FICO Score)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {creditDetails[0]?.payment_history && (
                    <>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-lg font-bold text-green-700">
                          {creditDetails[0].payment_history.on_time_payments || 0}
                        </div>
                        <div className="text-xs text-green-600">On-time Payments</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-lg font-bold text-red-700">
                          {creditDetails[0].payment_history.late_payments_30 || 0}
                        </div>
                        <div className="text-xs text-red-600">30+ Days Late</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-lg font-bold text-red-700">
                          {creditDetails[0].payment_history.late_payments_60 || 0}
                        </div>
                        <div className="text-xs text-red-600">60+ Days Late</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-lg font-bold text-red-700">
                          {creditDetails[0].payment_history.late_payments_90 || 0}
                        </div>
                        <div className="text-xs text-red-600">90+ Days Late</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Credit Utilization */}
            {creditDetails.some(detail => detail.credit_utilization) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Credit Utilization (30% of FICO Score)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {creditDetails[0]?.credit_utilization && (
                    <>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">
                          {creditDetails[0].credit_utilization.overall_utilization_ratio ? 
                            `${creditDetails[0].credit_utilization.overall_utilization_ratio}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-blue-600">Overall Utilization</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">
                          {creditDetails[0].credit_utilization.total_outstanding_debt ? 
                            `$${Number(creditDetails[0].credit_utilization.total_outstanding_debt).toLocaleString()}` : 'N/A'}
                        </div>
                        <div className="text-xs text-blue-600">Total Outstanding Debt</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">
                          {creditDetails[0].credit_utilization.total_credit_limits ? 
                            `$${Number(creditDetails[0].credit_utilization.total_credit_limits).toLocaleString()}` : 'N/A'}
                        </div>
                        <div className="text-xs text-blue-600">Total Credit Limits</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Inquiries */}
            {creditDetails.some(detail => detail.inquiries?.length > 0) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Inquiries (10% of FICO Score)</h3>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Inquirer</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Type</th>
                      <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Date</th>
                  </tr>
                  </thead>
                  <tbody>
                    {creditDetails.flatMap((detail, idx) => 
                      (detail.inquiries || []).map((inq, i) => (
                        <tr key={`inq-${idx}-${i}`} className="hover:bg-gray-50"> 
                          <td className="px-3 py-2 text-sm">{inq.name || 'N/A'}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              inq.type === 'hard' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {inq.type || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm">{inq.date || 'N/A'}</td>
                  </tr>
                      ))
                    )}
            </tbody>
          </table>
              </div>
            )}

            {/* Collections & Public Records */}
            {(creditDetails.some(detail => detail.collections?.length > 0) || 
              creditDetails.some(detail => detail.public_records?.length > 0)) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Negative Items</h3>
                <div className="space-y-3">
                  {/* Collections */}
                  {creditDetails.some(detail => detail.collections?.length > 0) && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Collections</h4>
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Collection Agency</th>
                            <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Amount</th>
                            <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditDetails.flatMap((detail, idx) => 
                            (detail.collections || []).map((col, i) => (
                              <tr key={`col-${idx}-${i}`} className="hover:bg-gray-50"> 
                                <td className="px-3 py-2 text-sm">{col.name || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm font-medium">
                                  {col.amount ? `$${Number(col.amount).toLocaleString()}` : 'N/A'}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {col.status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Public Records */}
                  {creditDetails.some(detail => detail.public_records?.length > 0) && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Public Records</h4>
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Type</th>
                            <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Amount</th>
                            <th className="px-3 py-2 border-b text-left text-xs font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditDetails.flatMap((detail, idx) => 
                            (detail.public_records || []).map((rec, i) => (
                              <tr key={`rec-${idx}-${i}`} className="hover:bg-gray-50"> 
                                <td className="px-3 py-2 text-sm">{rec.type || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm font-medium">
                                  {rec.amount ? `$${Number(rec.amount).toLocaleString()}` : 'N/A'}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {rec.status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No credit details extracted yet.</div>
        )}
      </div>

      {/* Table 3: Credit Details Summary - All Information from keep.txt */}
      <div className="card">
        <h2 className="text-lg font-bold mb-2">Credit Details Summary</h2>
        <p className="text-sm text-gray-600 mb-4">Complete comprehensive information from your credit documents</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line max-h-96 overflow-y-auto">
          {summary ? summary : 'No credit details summary available yet. Click "Read Info" to extract comprehensive credit information from your uploaded documents.'}
        </div>
      </div>

      {/* Table 4: Analyzed Reports */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">Analyzed Reports</h2>
          <div className="flex gap-2 items-center">
            {analyzedReports.length > 0 && (
              <>
                <button
                  onClick={fetchAnalyzedReports}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Refresh
                </button>
                <button
                  onClick={handleClearAnalyzedReports}
                  className="text-xs text-red-600 hover:text-red-800 underline ml-2"
                >
                  Clear All Reports
                </button>
              </>
            )}
          </div>
        </div>
        {analyzedReports.length > 0 ? (
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Date & Time</th>
                <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Credit Score</th>
                <th className="px-4 py-2 border-b text-center text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 border-b text-center text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyzedReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b text-sm text-gray-900">
                    {report.timestamp || report.date}
                  </td>
                  <td className="px-4 py-2 border-b text-sm">
                    <span className="font-semibold text-green-700">
                      {report.analysis?.credit_score || report.credit_score}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b text-sm text-center flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => handleViewAnalyzedReport(report)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadAnalyzedReportPDF(report)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Download PDF
                    </button>
                    <button
                      title="Delete Report"
                      onClick={() => handleDeleteSingleReport(report)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500 text-sm py-8 text-center">
            No analyzed reports yet.
          </div>
        )}
      </div>

      {/* Analysis Result Modal */}
      {showAnalysisModal && selectedAnalysisId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowAnalysisModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <AnalysisResult id={selectedAnalysisId} isModal={true} />
          </div>
        </div>
      )}

      {/* Clear Data Modal */}
      <Transition appear show={showClearModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isClearing && setShowClearModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Confirm Clear Data
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to clear all credit data? This will delete all uploaded documents, extracted credit information, and keep.txt file. <b>Analyzed reports will be preserved.</b>
                    </p>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setShowClearModal(false)}
                      disabled={isClearing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={async () => {
                        if (isClearing) return;
                        setIsClearing(true);
                        try {
                          await handleClearData();
                          await fetchAnalyzedReports();
                          setShowClearModal(false);
                        } catch (err) {
                          toast.error('Failed to clear data.');
                        } finally {
                          setIsClearing(false);
                        }
                      }}
                      disabled={isClearing}
                    >
                      {isClearing ? (
                        <span className="flex items-center"><span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>Clearing...</span>
                      ) : (
                        'Clear Data'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal for Analyzed Reports */}
      <Transition appear show={showDeleteModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={cancelDelete}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {deleteTarget === 'all' ? 'Clear All Analyzed Reports' : 'Delete Analyzed Report'}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {deleteTarget === 'all'
                        ? 'Are you sure you want to delete all analyzed reports? This action cannot be undone.'
                        : 'Are you sure you want to delete this analyzed report? This action cannot be undone.'}
                    </p>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={cancelDelete}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={confirmDelete}
                    >
                      {deleteTarget === 'all' ? 'Clear All' : 'Delete'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
} 