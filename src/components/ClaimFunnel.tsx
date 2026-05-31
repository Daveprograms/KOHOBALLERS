import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ReferralItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactMethod: string;
  livesInCanada: boolean;
  hasKoho: boolean;
  hasNeo: boolean;
  provider: string; // 'KOHO', 'Neo', or 'Both'
  status: 'pending' | 'approved' | 'declined' | 'contacted';
  createdAt: string;
  adminNotes: string;
  payoutRef: string;
  payoutAmount?: number;
  processedAt?: string;
}

interface ClaimFunnelProps {
  onSuccess: (email: string) => void;
  onNavigate: (view: 'claim' | 'leaderboard') => void;
  summary: {
    recentPayouts: Array<{ name: string; provider: string; amount: number; time: string }>;
    stats: { totalPaidOut: number };
  } | null;
}

export const ClaimFunnel: React.FC<ClaimFunnelProps> = ({ onSuccess, onNavigate, summary }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tickerIndex, setTickerIndex] = useState(0);

  // Auto scroll payouts ticker every 2 seconds
  useEffect(() => {
    if (!summary || !summary.recentPayouts || summary.recentPayouts.length <= 1) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % summary.recentPayouts.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [summary]);
  
  // Questionnaire states
  const [livesInCanada, setLivesInCanada] = useState<boolean | null>(null);
  const [hasKoho, setHasKoho] = useState<boolean>(false);
  const [hasNeo, setHasNeo] = useState<boolean>(false);
  
  // Contact states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState('WhatsApp');
  const [bestTime, setBestTime] = useState('Afternoon');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline Lookup states
  const [showLookup, setShowLookup] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResults, setLookupResults] = useState<ReferralItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const getEligibilityProvider = () => {
    if (!hasKoho && !hasNeo) return 'Both';
    if (!hasKoho) return 'KOHO';
    if (!hasNeo) return 'Neo';
    return 'None';
  };

  const getEstimatedPayout = () => {
    const provider = getEligibilityProvider();
    if (provider === 'Both') return 200;
    if (provider === 'None') return 0;
    return 100;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (livesInCanada === null) {
        setError("Please select an answer.");
        return;
      }
      if (!livesInCanada) {
        setStep(2); // Goes to international residency fallback screen
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      setError(null);
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      setError("Please fill out all contact fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        email,
        phone,
        contactMethod: `${contactMethod} (${bestTime})`,
        livesInCanada: !!livesInCanada,
        hasKoho: !!hasKoho,
        hasNeo: !!hasNeo,
        provider: getEligibilityProvider()
      };

      const response = await fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit eligibility request.");
      }

      // Celebrate eligibility submission!
      const totalBonus = getEstimatedPayout();
      if (totalBonus > 0) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#00B4D8', '#FFB703', '#3B82F6']
        });
      }

      // Reset form fields
      setName('');
      setEmail('');
      setPhone('');
      
      // Auto open lookup so they can see their lead in real time!
      setLookupEmail(email);
      setShowLookup(true);
      setStep(1);
      setLivesInCanada(null);
      setHasKoho(false);
      setHasNeo(false);

      // Refresh lead details
      handleSearchLookup(email);

      // Refresh public payout summaries
      onSuccess(email);

    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Inline lookup handler
  const handleSearchLookup = async (searchEmailVal?: string) => {
    const emailToSearch = searchEmailVal || lookupEmail;
    if (!emailToSearch) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResults([]);

    try {
      const res = await fetch(`/api/my-referrals?email=${encodeURIComponent(emailToSearch.trim().toLowerCase())}`);
      if (!res.ok) {
        throw new Error("Lookup search failed.");
      }
      const data = await res.json();
      setLookupResults(data);
      if (data.length === 0) {
        setLookupError("No lead registered under this email.");
      }
    } catch (err) {
      setLookupError("Unable to load lead status. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Helper to format ticker relative times
  const formatRelativeTime = (timeStr: string) => {
    try {
      const diffMs = Date.now() - new Date(timeStr).getTime();
      const diffMins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'just now';
    }
  };

  const getStatusBadgeLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'New Lead';
      case 'contacted': return 'Contacted';
      case 'approved': return 'Signed Up & Paid';
      case 'declined': return 'Ineligible';
      default: return status;
    }
  };

  const getStatusMessage = (item: ReferralItem) => {
    if (item.status === 'pending') {
      return "Eligibility received! An organizer is preparing your invite codes and will text you via WhatsApp/SMS shortly.";
    }
    if (item.status === 'contacted') {
      return `Organizer contacted you! Check your phone. Notes: "${item.adminNotes || 'Links sent.'}"`;
    }
    if (item.status === 'approved') {
      return `Paid! E-transfer of $${item.payoutAmount || 100} CAD processed with Reference: ${item.payoutRef}. Check inbox!`;
    }
    return `Ineligible: ${item.adminNotes || "Eligibility checks failed."}`;
  };

  return (
    <div className="container">
      {/* Questionnaire Form Progress Bar */}
      {livesInCanada !== false && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              style={{ 
                flex: 1, 
                height: '4px', 
                borderRadius: '2px', 
                background: step >= s ? 'var(--accent-success)' : 'var(--border-light)',
                boxShadow: step >= s ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'var(--transition-fast)' 
              }}
            />
          ))}
        </div>
      )}

      {step === 1 && (
        /* STEP 1: CANADIAN RESIDENCY */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slide-in var(--transition-smooth)' }}>
          <div className="text-center">
            <h1 className="title-xl">
              <span className="gradient-text">Bonus Registration</span>
            </h1>
            <p className="subtitle-md">Fill out a 30-second form to claim your $100 CAD payout bonuses.</p>
          </div>

          <div className="form-card" style={{ gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '15px', fontWeight: 'bold', textAlign: 'center' }}>
              Are you currently living in Canada? 🇨🇦
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className={`file-upload-zone ${livesInCanada === true ? 'dragging' : ''}`}
                style={{ padding: '24px', borderStyle: livesInCanada === true ? 'solid' : 'dashed', borderColor: livesInCanada === true ? 'var(--accent-success)' : 'var(--border-light)' }}
                onClick={() => setLivesInCanada(true)}
              >
                <div style={{ fontSize: '24px' }}>🍁</div>
                <strong style={{ fontSize: '14px', color: livesInCanada === true ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                  Yes, I reside in Canada
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Eligible for KOHO &amp; Neo bonuses</span>
              </button>

              <button
                type="button"
                className={`file-upload-zone ${livesInCanada === false ? 'dragging' : ''}`}
                style={{ padding: '24px', borderStyle: livesInCanada === false ? 'solid' : 'dashed', borderColor: livesInCanada === false ? 'var(--accent-danger)' : 'var(--border-light)' }}
                onClick={() => setLivesInCanada(false)}
              >
                <div style={{ fontSize: '24px' }}>✈️</div>
                <strong style={{ fontSize: '14px', color: livesInCanada === false ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                  No, I live outside Canada
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Products restricted to Canada</span>
              </button>
            </div>

            <button className="btn-primary" onClick={handleNextStep}>
              Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 2 && livesInCanada === false && (
        /* FALBACK EXIT RESIDENCY */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slide-in var(--transition-smooth)' }}>
          <div className="form-card text-center" style={{ padding: '40px 20px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.02)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🇨🇦</div>
            <h2 className="title-xl gradient-text" style={{ fontSize: '22px' }}>Canada Residency Required</h2>
            <p className="subtitle-md" style={{ margin: '14px 0', fontSize: '13px' }}>
              Apologies! KOHO and Neo banking products are strictly available to Canadian residents. We cannot process bonuses internationally.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-primary" onClick={() => onNavigate('leaderboard')}>
                👥 Refer Friends &amp; Earn $20 CAD
              </button>
              <button className="btn-secondary" onClick={() => { setLivesInCanada(null); setStep(1); }}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && livesInCanada === true && (
        /* STEP 2: BANK OWNERSHIP */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slide-in var(--transition-smooth)' }}>
          <div className="text-center">
            <h1 className="title-xl">
              <span className="gradient-text">Card Eligibility</span>
            </h1>
            <p className="subtitle-md">Select bank accounts you currently have to check eligible commissions.</p>
          </div>

          <div className="form-card">
            <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Do you already have accounts with these banks?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* KOHO Switch */}
              <div 
                className={`calc-switch-card ${!hasKoho ? 'active koho-active' : ''}`}
                style={{ padding: '16px', borderStyle: 'solid' }}
                onClick={() => setHasKoho(!hasKoho)}
              >
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: !hasKoho ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      💳 KOHO Account
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {!hasKoho ? '✨ Eligible for $100 bonus!' : 'Already have account'}
                    </div>
                  </div>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    border: '1px solid var(--border-light)', 
                    background: !hasKoho ? 'var(--accent-koho)' : 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    color: '#000' 
                  }}>
                    {!hasKoho ? '✓' : ''}
                  </div>
                </div>
              </div>

              {/* Neo Switch */}
              <div 
                className={`calc-switch-card ${!hasNeo ? 'active neo-active' : ''}`}
                style={{ padding: '16px', borderStyle: 'solid' }}
                onClick={() => setHasNeo(!hasNeo)}
              >
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: !hasNeo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      🪙 Neo Financial Account
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {!hasNeo ? '✨ Eligible for $100 bonus!' : 'Already have account'}
                    </div>
                  </div>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    border: '1px solid var(--border-light)', 
                    background: !hasNeo ? 'var(--accent-neo)' : 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    color: '#000' 
                  }}>
                    {!hasNeo ? '✓' : ''}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                &larr; Back
              </button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleNextStep}>
                Check Payout Value &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && livesInCanada === true && (
        /* STEP 3: LEAD CONTACT FORM */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slide-in var(--transition-smooth)' }}>
          <div className="text-center">
            <h1 className="title-xl">
              <span className="gradient-text">Claim My Bonuses</span>
            </h1>
            <p className="subtitle-md">Fill out your contact details. An organizer will follow up with invite codes.</p>
          </div>

          <form className="form-card" onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Congratulations Banner */}
            <div 
              style={{ 
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))', 
                border: '1px solid var(--border-emerald)', 
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'center', 
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)' 
              }}
            >
              {getEstimatedPayout() > 0 ? (
                <>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎉</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CONGRATULATIONS! ELIGIBILITY CONFIRMED</div>
                  <div style={{ fontSize: '22px', fontFamily: 'var(--font-header)', fontWeight: '800', color: 'var(--accent-success)', marginTop: '4px' }}>
                    Earn up to ${getEstimatedPayout()} CAD cash!
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>👥</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>ACCOUNT OWNERSHIP ALREADY REGISTERED</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>
                    You already have both accounts, but **you can earn $20 CAD for every friend** you refer!
                  </div>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Marcus Miller" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="marcus.m@example.ca" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Best place to reach you)</label>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="647-555-0192" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>

            <div className="provider-select-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Contact Platform</label>
                <select 
                  className="form-input" 
                  value={contactMethod} 
                  onChange={(e) => setContactMethod(e.target.value)}
                  style={{ background: 'rgba(15, 23, 42, 0.7)', cursor: 'pointer' }}
                  disabled={loading}
                >
                  <option value="WhatsApp">💬 WhatsApp</option>
                  <option value="SMS/Text">📱 SMS / Text</option>
                  <option value="Direct Call">📞 Direct Call</option>
                  <option value="Email">✉️ Email</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Best Time to Call</label>
                <select 
                  className="form-input" 
                  value={bestTime} 
                  onChange={(e) => setBestTime(e.target.value)}
                  style={{ background: 'rgba(15, 23, 42, 0.7)', cursor: 'pointer' }}
                  disabled={loading}
                >
                  <option value="Morning">🌅 Morning</option>
                  <option value="Afternoon">☀️ Afternoon</option>
                  <option value="Evening">🌌 Evening</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                Back
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? "Registering lead..." : "Submit Form & Claim"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INLINE STATUS TRACKER (Always visible at the bottom!) */}
      <div className="faq-item" style={{ marginTop: '20px', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
        <button 
          className="faq-question" 
          type="button"
          onClick={() => setShowLookup(!showLookup)}
          style={{ background: 'rgba(255,255,255,0.01)', fontWeight: 'bold' }}
        >
          <span>🔍 Track My Referral Payout Status</span>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', transform: showLookup ? 'rotate(180deg)' : 'none', transition: 'var(--transition-fast)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showLookup && (
          <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.2)', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="Enter registered email..."
                className="form-input"
                style={{ flex: 1 }}
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleSearchLookup(); }}
              />
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: 'auto', padding: '10px 16px', fontSize: '12px' }}
                onClick={() => handleSearchLookup()}
                disabled={lookupLoading}
              >
                {lookupLoading ? "Searching..." : "Track"}
              </button>
            </div>

            {lookupError && (
              <div style={{ color: 'var(--accent-danger)', fontSize: '11px', fontWeight: 'bold' }}>
                ⚠️ {lookupError}
              </div>
            )}

            {lookupResults.map((item) => (
              <div className="referral-payout-card" key={item.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge-outline ${item.provider.toLowerCase()}`} style={{ fontSize: '9px' }}>
                    {item.provider === 'Both' ? 'KOHO + Neo' : item.provider}
                  </span>
                  <span className={`status-badge ${item.status}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                    {getStatusBadgeLabel(item.status)}
                  </span>
                </div>

                {/* Inline Payout status timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', position: 'relative', margin: '6px 0' }}>
                  <div style={{ position: 'absolute', left: '0', right: '0', height: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>
                  <div style={{ 
                    position: 'absolute', 
                    left: '0', 
                    width: item.status === 'approved' ? '100%' : item.status === 'declined' ? '50%' : item.status === 'contacted' ? '50%' : '15%', 
                    height: '2px', 
                    background: item.status === 'approved' ? 'var(--accent-success)' : item.status === 'declined' ? 'var(--accent-danger)' : item.status === 'contacted' ? 'var(--accent-pending)' : 'var(--accent-koho)', 
                    zIndex: 0 
                  }}></div>

                  {/* Nodes */}
                  {['Submitted', 'Contacted', 'Paid'].map((label, idx) => {
                    const isActive = idx === 0 || 
                      (idx === 1 && (item.status === 'contacted' || item.status === 'approved' || item.status === 'declined')) || 
                      (idx === 2 && item.status === 'approved');
                    const isRed = idx === 1 && item.status === 'declined';
                    const isOrange = idx === 1 && item.status === 'contacted';
                    return (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                        <div style={{ 
                          width: '14px', 
                          height: '14px', 
                          borderRadius: '50%', 
                          background: isRed ? 'var(--accent-danger)' : isOrange ? 'var(--accent-pending)' : isActive ? 'var(--accent-success)' : 'var(--bg-primary)', 
                          border: isActive ? 'none' : '1px solid var(--border-light)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '8px', 
                          fontWeight: 'bold', 
                          color: '#FFF' 
                        }}>
                          {isActive ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: '8px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '8px', fontSize: '11px', marginTop: '6px' }}>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 'bold' }}>Organizer:</span>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{getStatusMessage(item)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VERIFIED LIVE TICKER (Always visible at the bottom!) */}
      {summary && summary.recentPayouts && summary.recentPayouts.length > 0 && (
        <div className="ticker-box" style={{ marginTop: '20px' }}>
          <div className="ticker-title">
            <div className="ticker-dot"></div>
            <span>Live verified payouts ticker</span>
          </div>
          <div className="ticker-list" style={{ height: '36px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              transform: `translateY(-${tickerIndex * 36}px)`,
              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {summary.recentPayouts.map((payout, index) => (
                <div className="ticker-item" key={index} style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    🍁 <strong>{payout.name}</strong> joined {payout.provider === 'Both' ? 'KOHO+Neo' : payout.provider}
                  </div>
                  <span>+${payout.amount} CAD Paid ({formatRelativeTime(payout.time)})</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Total Paid Out: <span style={{ color: 'var(--accent-success)', fontWeight: 'bold' }}>${summary.stats.totalPaidOut} CAD</span>
          </div>
        </div>
      )}
    </div>
  );
};
