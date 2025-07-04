import { useState, useEffect } from 'react';
import { creditAPI } from '../services/api';
import { creditDetailsAPI } from '../services/api';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

const FICO_MIN = 300;
const FICO_MAX = 850;

const scenarios = [
  { key: 'pay_on_time', label: 'Pay bills on time', icon: '📅' },
  { key: 'miss_payment', label: 'Forget to pay a bill', icon: '⚠️' },
  { key: 'regular_card', label: 'Make regular card payments', icon: '💳' },
  { key: 'pay_down', label: 'Pay down balances', icon: '💵' },
  { key: 'get_card', label: 'Get a credit card', icon: '💳' },
  { key: 'mortgage', label: 'Take out a mortgage', icon: '🏠' },
  { key: 'auto_loan', label: 'Take out an auto loan', icon: '🚗' },
  { key: 'age_report', label: 'Age credit report', icon: '📊' },
  { key: 'increase_limit', label: 'Increase card limit', icon: '⬆️' },
];

function ficoSimulate(base, changes) {
  // Simple FICO-like logic for demo
  let score = base;
  if (changes === 'pay_on_time') score += 10;
  if (changes === 'miss_payment') score -= 60;
  if (changes === 'regular_card') score += 5;
  if (changes === 'pay_down') score += 20;
  if (changes === 'get_card') score -= 5;
  if (changes === 'mortgage') score -= 10;
  if (changes === 'auto_loan') score -= 8;
  if (changes === 'age_report') score += 7;
  if (changes === 'increase_limit') score += 3;
  if (score > FICO_MAX) score = FICO_MAX;
  if (score < FICO_MIN) score = FICO_MIN;
  return score;
}

function CreditSimulatorInner() {
  const [baseline, setBaseline] = useState(681);
  const [simulated, setSimulated] = useState(681);
  const [lastScenario, setLastScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [hasCreditData, setHasCreditData] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualScore, setManualScore] = useState('681');

  useEffect(() => {
    // Try to fetch baseline score from .keep file via API
    creditAPI.getCreditDetails()
      .then(({ data }) => {
        let score = 681;
        if (data?.details?.length) {
          for (const detail of data.details) {
            if (detail.personal_info?.credit_score) {
              score = Number(detail.personal_info.credit_score);
              setHasCreditData(true);
              break;
            }
          }
        }
        setBaseline(score);
        setSimulated(score);
        setLoading(false);
      })
      .catch((error) => {
        console.log('No credit data available, allowing manual entry');
        setHasCreditData(false);
        setShowManualEntry(true);
        setLoading(false);
      });

    // Try to fetch summary from keep.txt
    creditDetailsAPI.getSummary()
      .then(({ data }) => {
        setSummary(data.summary || '');
      })
      .catch((error) => {
        console.log('No credit summary available');
      });
  }, []);

  const handleScenario = (key) => {
    setSimulated(ficoSimulate(baseline, key));
    setLastScenario(key);
  };

  const handleManualScoreSubmit = () => {
    const score = parseInt(manualScore);
    if (score >= FICO_MIN && score <= FICO_MAX) {
      setBaseline(score);
      setSimulated(score);
      setShowManualEntry(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-80">
      <div className="flex flex-col items-center">
        <span className="rainbow-spinner mb-4"></span>
        <span className="text-lg font-semibold text-indigo-700 animate-pulse">Loading Credit Details...</span>
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

  // Show manual entry form if no credit data is available
  if (showManualEntry) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-2xl font-bold text-center mb-2">Credit Simulator</h1>
        <p className="text-center text-gray-600 mb-6">
          No credit data found. Enter your current credit score to start simulating.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Enter Your Credit Score</h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={FICO_MIN}
              max={FICO_MAX}
              value={manualScore}
              onChange={(e) => setManualScore(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter score (300-850)"
            />
            <button
              onClick={handleManualScoreSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Start Simulating
            </button>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            Enter a score between {FICO_MIN} and {FICO_MAX}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            Don't have your credit score? You can get a free copy of your credit report from:
          </p>
          <div className="space-y-2">
            <a href="https://www.annualcreditreport.com" target="_blank" rel="noopener noreferrer" 
               className="block text-blue-600 hover:text-blue-800 underline">
              AnnualCreditReport.com
            </a>
            <a href="https://www.creditkarma.com" target="_blank" rel="noopener noreferrer" 
               className="block text-blue-600 hover:text-blue-800 underline">
              Credit Karma
            </a>
            <a href="https://www.experian.com" target="_blank" rel="noopener noreferrer" 
               className="block text-blue-600 hover:text-blue-800 underline">
              Experian
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-2">Credit Simulator</h1>
      <p className="text-center text-gray-600 mb-4">
        See how everyday credit decisions may influence your FICO® Score 8 before you make them.
      </p>
      
      {/* Credit score source indicator */}
      <div className="text-center mb-4">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          hasCreditData 
            ? 'bg-green-100 text-green-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {hasCreditData ? '📊 From Credit Report' : '✏️ Manually Entered'}
        </span>
        {hasCreditData && (
          <button
            onClick={() => setShowManualEntry(true)}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Change Score
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="text-center">
          <div className="text-xs text-gray-500">Current</div>
          <div className="text-4xl font-bold text-blue-700">{baseline}</div>
        </div>
        <div className="text-3xl">→</div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Simulated</div>
          <div className="text-4xl font-bold text-green-600">{simulated}</div>
          <div className="text-sm text-green-700 font-semibold">{simulated - baseline >= 0 ? '+' : ''}{simulated - baseline} pts</div>
        </div>
      </div>
      {/* FICO slider bar */}
      <div className="relative w-full h-4 bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 rounded-full my-4">
        <div
          className="absolute top-0 h-4 w-2 bg-blue-900 rounded"
          style={{ left: `${((simulated - FICO_MIN) / (FICO_MAX - FICO_MIN)) * 100}%`, transform: 'translateX(-50%)' }}
        ></div>
        <div className="absolute left-0 -top-6 text-xs text-gray-500">{FICO_MIN}</div>
        <div className="absolute right-0 -top-6 text-xs text-gray-500">{FICO_MAX}</div>
      </div>
      <div className="mt-6 mb-2 text-lg font-semibold">I might...</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {scenarios.map(s => (
          <button
            key={s.key}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border shadow-sm transition-colors text-base font-medium ${lastScenario === s.key ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'}`}
            onClick={() => handleScenario(s.key)}
          >
            <span className="text-2xl mb-1">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mb-4">
        The FICO® Score Simulator is a tool that helps you understand how specific credit choices may affect credit scores. The simulated score is an estimate and for educational purposes only. Actual results may vary.
      </div>
    </div>
  );
}

export default function CreditSimulatorProtected() {
  return <ProtectedRoute vipOnly={true}><CreditSimulatorInner /></ProtectedRoute>;
} 