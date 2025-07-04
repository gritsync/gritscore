import { useEffect, useState, useRef } from 'react';
import { creditAPI } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AnalysisResult({ id: propId, isModal }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const contentRef = useRef();
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (!propId) return;
    setLoading(true);
    setError(null);
    creditAPI.getAnalysisById(propId)
      .then(({ data }) => {
        setResult(data.analysis || data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch analysis result.');
        setLoading(false);
      });
  }, [propId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[200px]">
      <span className="rainbow-spinner mr-2"></span>
      <span className="text-lg font-semibold text-indigo-700 animate-pulse">Loading Analysis...</span>
      <style>{`
        .rainbow-spinner {
          width: 32px;
          height: 32px;
          border: 4px solid #e0e7ff;
          border-top: 4px solid #6366f1;
          border-right: 4px solid #22d3ee;
          border-bottom: 4px solid #22c55e;
          border-left: 4px solid #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!result) return null;

  // Helper to render arrays or objects as lists
  const renderList = (arr) => Array.isArray(arr) ? (
    <ul className="list-disc ml-6 space-y-1">{arr.map((item, i) => <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>)}</ul>
  ) : null;

  // Helper for account types
  const renderAccountTypes = (types) => types && typeof types === 'object' ? (
    <ul className="list-disc ml-6 space-y-1">
      {Object.entries(types).map(([type, count]) => (
        <li key={type}><span className="capitalize font-semibold">{type.replace(/_/g, ' ')}:</span> {count}</li>
      ))}
    </ul>
  ) : null;

  // Helper for payment history breakdown
  const renderPaymentHistory = (ph) => ph ? (
    <ul className="ml-4 text-sm">
      <li>On Time: {ph.on_time || ph.on_time_payments || 0}</li>
      <li>Late: {ph.late || ph.late_payments_30 || 0}</li>
      {ph.late_payments_60 !== undefined && <li>60+ Days Late: {ph.late_payments_60}</li>}
      {ph.late_payments_90 !== undefined && <li>90+ Days Late: {ph.late_payments_90}</li>}
      {ph.late_payments_120 !== undefined && <li>120+ Days Late: {ph.late_payments_120}</li>}
    </ul>
  ) : null;

  // PDF download handler
  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    const input = contentRef.current;
    if (!input) { setDownloadingPDF(false); return; }
    // Use html2canvas to capture the content, then split into pages if needed
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    let position = 0;
    if (pdfHeight < pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page logic
      let remainingHeight = pdfHeight;
      let pageNum = 0;
      while (remainingHeight > 0) {
        pdf.addImage(
          imgData,
          'PNG',
          0,
          position,
          pdfWidth,
          pdfHeight
        );
        remainingHeight -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          position -= pageHeight;
        }
      }
    }
    pdf.save(`credit_analysis_${propId}.pdf`);
    setDownloadingPDF(false);
  };

  // Professional summary for Credit Overview
  const creditOverview = () => {
    const score = result.credit_score;
    const util = result.credit_utilization;
    const avgAge = result.avg_account_age || result.avg_account_age_months;
    const neg = result.negative_items;
    const onTime = result.payment_history?.on_time || result.payment_history?.on_time_payments || 0;
    const late = result.payment_history?.late || result.payment_history?.late_payments_30 || 0;
    const types = result.account_types ? Object.entries(result.account_types).map(([type, count]) => `${type}: ${count}`).join(', ') : '';
    return (
      <ul className="list-disc ml-6 space-y-1 text-gray-700">
        <li><b>Credit Score:</b> {score}</li>
        <li><b>Utilization:</b> {util}%</li>
        <li><b>Average Account Age:</b> {avgAge} months</li>
        <li><b>Negative Items:</b> {neg}</li>
        <li><b>Payment History:</b> On Time: {onTime}, Late: {late}</li>
        {types && <li><b>Account Types:</b> {types}</li>}
      </ul>
    );
  };

  return (
    <div className={isModal ? 'p-6' : 'max-w-3xl mx-auto p-8'}>
      <div ref={contentRef}>
        {/* Green gradient header */}
        <div className="rounded-t-lg bg-gradient-to-r from-green-400 via-green-500 to-green-600 p-4 mb-4 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white">Your Credit Report Analysis</h2>
          <div className="text-white text-sm mt-1">AI-powered insights, personalized for you.</div>
          <div className="text-white text-xs font-semibold tracking-widest uppercase mt-1">GritScore.ai</div>
        </div>
        {/* Timestamp */}
        {result.timestamp && (
          <div className="text-xs text-gray-500 text-center mb-4">Analyzed on: {new Date(result.timestamp).toLocaleString()}</div>
        )}
        <main className="bg-white rounded-xl shadow-xl mt-[-3rem] mb-8 p-8 relative z-10">
          {/* 4-box summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Credit Score (highlighted) */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl shadow border-2 border-green-500 bg-green-50">
              <div className="text-xs font-semibold text-green-700 uppercase mb-1">Credit Score</div>
              <div className="text-4xl font-extrabold text-green-700 mb-1">{result.credit_score}</div>
              <div className="text-green-600 font-semibold text-sm">{result.score_rating}</div>
            </div>
            {/* Credit Utilization */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl shadow border border-gray-200 bg-gray-50">
              <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Credit Utilization</div>
              <div className="text-2xl font-bold text-green-700 mb-1">{result.credit_utilization}%</div>
            </div>
            {/* Payment History */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl shadow border border-gray-200 bg-gray-50">
              <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Payment History</div>
              <div className="text-lg font-bold text-green-700 mb-1">
                On Time: {result.payment_history?.on_time || result.payment_history?.on_time_payments || 0}
              </div>
              <div className="text-sm text-gray-700">Late: {result.payment_history?.late || result.payment_history?.late_payments_30 || 0}</div>
            </div>
            {/* Account Types */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl shadow border border-gray-200 bg-gray-50">
              <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Account Types</div>
              <div className="text-sm text-green-700 font-bold mb-1">
                {result.account_types && typeof result.account_types === 'object' ? (
                  Object.entries(result.account_types).map(([type, count]) => (
                    <div key={type} className="capitalize">{type.replace(/_/g, ' ')}: <span className="font-semibold">{count}</span></div>
                  ))
                ) : 'N/A'}
              </div>
            </div>
          </div>
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Credit Overview</h2>
            {creditOverview()}
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Executive Summary</h2>
            <div className="text-gray-700 whitespace-pre-line">{result.detailed_analysis}</div>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Top 5+ Actionable Steps to Improve Your Credit</h2>
            {renderList(result.action_steps)}
          </section>
          {result.negative_item_plans && result.negative_item_plans.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xl font-bold text-green-700 mb-2">How to Resolve Negative Items</h2>
              {renderList(result.negative_item_plans)}
            </section>
          )}
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Your Personalized 90-Day Roadmap</h2>
            {renderList(result.roadmap_90_days)}
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Maximize Your Approval Odds</h2>
            <div className="text-gray-700 whitespace-pre-line">{result.approval_advice}</div>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Credit Report &amp; Score FAQs</h2>
            {Array.isArray(result.faq) ? (
              <ul className="list-disc ml-6 space-y-3">
                {result.faq.map((item, i) => {
                  // Support both lowercase and capitalized keys
                  const fact = item.Fact || item.fact;
                  const myth = item.Myth || item.myth;
                  return (typeof item === 'object' && (fact || myth)) ? (
                    <li key={i} className="">
                      {fact && <div><span className="font-semibold text-green-800">Fact:</span> {fact}</div>}
                      {myth && <div><span className="font-semibold text-red-700">Myth:</span> {myth}</div>}
                    </li>
                  ) : (
                    <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
                  );
                })}
              </ul>
            ) : null}
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-bold text-green-700 mb-2">Improvement Advice</h2>
            <div className="text-gray-700 whitespace-pre-line">{result.improvement_advice}</div>
          </section>
        </main>
        <footer className="w-full text-center text-xs text-green-900 py-4 bg-gradient-to-r from-green-100 via-green-50 to-green-200 border-t mt-8">
          &copy; 2025 GritScore. All rights reserved.
        </footer>
      </div>
      {/* Centered PDF Download Button */}
      <div className="flex justify-center mt-8 mb-4">
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-150 flex items-center justify-center"
          disabled={downloadingPDF}
        >
          {downloadingPDF ? (
            <span className="flex items-center"><span className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></span>Generating PDF...</span>
          ) : (
            'Download PDF'
          )}
        </button>
      </div>
    </div>
  );
} 