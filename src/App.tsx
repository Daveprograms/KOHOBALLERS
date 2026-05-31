import { useState, useEffect } from 'react';
import { ClaimFunnel } from './components/ClaimFunnel';
import { LeaderboardView } from './components/LeaderboardView';

interface Summary {
  leaderboard: Array<{ name: string; referrals: number; earned: number }>;
  recentPayouts: Array<{ name: string; provider: string; amount: number; time: string }>;
  stats: {
    totalReferrals: number;
    approvedPayouts: number;
    pendingPayouts: number;
    totalPaidOut: number;
  };
}

function App() {
  // hyper-simplified 2 views: 'claim' (Get Paid) and 'leaderboard' (Top Earners)
  const [currentView, setCurrentView] = useState<'claim' | 'leaderboard'>('claim');
  const [summary, setSummary] = useState<Summary | null>(null);

  // Fetch summaries
  const fetchConfigAndSummary = async () => {
    try {
      const summaryRes = await fetch('/api/referrals/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Failed to load application summaries or statistics", err);
    }
  };

  useEffect(() => {
    fetchConfigAndSummary();
  }, [currentView]);

  const handleSubmissionSuccess = async () => {
    // Refresh stats
    await fetchConfigAndSummary();
  };

  // Render correct sub-page
  const renderViewContent = () => {
    switch (currentView) {
      case 'claim':
        return <ClaimFunnel onSuccess={handleSubmissionSuccess} onNavigate={setCurrentView} summary={summary} />;
      case 'leaderboard':
        return <LeaderboardView summary={summary} />;
      default:
        return <ClaimFunnel onSuccess={handleSubmissionSuccess} onNavigate={setCurrentView} summary={summary} />;
    }
  };

  return (
    <>
      {/* Sticky Premium Logo Header */}
      <header className="app-header">
        <div className="brand" onClick={() => setCurrentView('claim')} style={{ cursor: 'pointer' }}>
          <span className="brand-logo">BonusHunt</span>
          <span className="brand-badge">CAD 🍁</span>
        </div>
        
        {/* Dynamic Total Paid Counter bubble */}
        <div className="payout-tracker-bubble" onClick={() => setCurrentView('leaderboard')}>
          <span>🏆 ${summary ? summary.stats.totalPaidOut : 3900}</span> paid
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {renderViewContent()}
      </main>

      {/* Sticky Bottom Navigation - Stripped down to only the 2 public views! */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${currentView === 'claim' ? 'active' : ''}`}
          onClick={() => setCurrentView('claim')}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Get Paid
        </button>

        <button 
          className={`nav-item ${currentView === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('leaderboard')}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Top Earners
        </button>
      </nav>
    </>
  );
}

export default App;
