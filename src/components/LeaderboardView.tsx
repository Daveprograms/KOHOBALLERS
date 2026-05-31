import React, { useState } from 'react';

interface LeaderboardViewProps {
  summary: {
    leaderboard: Array<{ name: string; referrals: number; earned: number }>;
  } | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ summary }) => {
  const [copied, setCopied] = useState(false);

  const getLeaderboardData = () => {
    if (summary && summary.leaderboard) {
      return summary.leaderboard;
    }
    // Fallback static list
    return [
      { name: "David F. (You)", referrals: 14, earned: 1400 },
      { name: "Sophie Roy", referrals: 9, earned: 900 },
      { name: "Marc-Andre L.", referrals: 7, earned: 700 },
      { name: "Chloe Dufour", referrals: 4, earned: 400 },
      { name: "Ryan Wright", referrals: 3, earned: 300 }
    ];
  };

  const shareText = `🍁 Hey! Sign up for KOHO or Neo Financial using this link, and get their official bonuses PLUS an extra $100 CAD cash paid directly via E-transfer! 💰`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaSocial = (platform: 'whatsapp' | 'sms' | 'facebook') => {
    let url = '';
    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    } else if (platform === 'sms') {
      url = `sms:?&body=${encodeURIComponent(shareText)}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(shareText)}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 className="title-xl">
          <span className="gradient-text">Top Earners</span>
        </h1>
        <p className="subtitle-md">See how much regular Canadians are making this month by hunting bonuses.</p>
      </div>

      {/* Leaderboard Table */}
      <div className="leaderboard-list">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '12px 20px', 
            background: 'rgba(255,255,255,0.02)', 
            borderBottom: '1px solid var(--border-light)', 
            fontSize: '11px', 
            fontWeight: 'bold', 
            color: 'var(--text-muted)' 
          }}
        >
          <span>RANK &amp; MEMBER</span>
          <span>REFERRALS / TOTAL PAID</span>
        </div>
        
        {getLeaderboardData().map((row, index) => {
          const isMe = row.name.includes("You");
          return (
            <div className={`leaderboard-row ${isMe ? 'me' : ''}`} key={index}>
              <div className="leaderboard-rank-name">
                <div className="leaderboard-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </div>
                <span className="leaderboard-name">{row.name}</span>
              </div>
              <div className="leaderboard-score">
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                  {row.referrals} referrals
                </span>
                ${row.earned} CAD
              </div>
            </div>
          );
        })}
      </div>

      {/* Sharing Box */}
      <div className="share-card">
        <div className="share-title">⚡ Refer Friends, Earn $20 Extra</div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Share your referral code. For every friend who successfully completes their KOHO or Neo signup and claims their $100 payout, **we will send you $20 CAD** as an organizer reward!
        </p>

        <div className="share-copy-box">
          {shareText}
          <button className="btn-icon-copy" onClick={copyToClipboard} title="Copy invite text">
            {copied ? (
              <span style={{ color: 'var(--accent-success)', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        </div>

        <div className="share-actions">
          <button className="share-btn" onClick={() => shareViaSocial('whatsapp')}>
            💬 WhatsApp
          </button>
          <button className="share-btn" onClick={() => shareViaSocial('sms')}>
            📱 iMessage/SMS
          </button>
          <button className="share-btn" onClick={copyToClipboard}>
            {copied ? "✅ Copied!" : "📋 Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
};
