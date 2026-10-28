import React, { useState } from 'react';
import { authAPI } from '../api';

const ROLES = {
  student: { label: 'Student', icon: '🎓', hint: 'Access your quizzes & case studies' },
  staff:   { label: 'Staff',   icon: '🏫', hint: 'Manage subjects, quizzes & evaluations' },
};

function Login({ onLogin }) {
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminHint, setShowAdminHint] = useState(false);
  const [dark, setDark] = useState(false);

  // Forgot password state
  const [fpStep, setFpStep] = useState(null); // null | 'email' | 'otp'
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  const t = dark ? darkTokens : lightTokens;

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next === 5) { setMode('admin'); setLogoClicks(0); setShowAdminHint(false); }
    else if (next >= 3) setShowAdminHint(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      const { access_token, role, name } = response.data;
      if (mode === 'student' && role !== 'student') { setError('These credentials do not belong to a student account.'); setLoading(false); return; }
      if (mode === 'staff'   && role !== 'staff')   { setError('These credentials do not belong to a staff account.');   setLoading(false); return; }
      if (mode === 'admin'   && role !== 'admin')   { setError('These credentials do not belong to an admin account.');  setLoading(false); return; }
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      localStorage.setItem('userName', name);
      localStorage.setItem('userEmail', email);
      onLogin(role, name);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(', '));
      } else {
        setError(typeof detail === 'string' ? detail : 'Login failed. Check your credentials.');
      }
    } finally { setLoading(false); }
  };

  const back = () => { setMode(null); setEmail(''); setPassword(''); setError(''); setLogoClicks(0); setShowAdminHint(false); setFpStep(null); setFpEmail(''); setFpOtp(''); setFpNewPass(''); setFpMsg(''); setFpError(''); };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setFpLoading(true); setFpError('');
    try {
      await authAPI.forgotPassword(fpEmail);
      setFpMsg('OTP sent to your email. Check your inbox.');
      setFpStep('otp');
    } catch (err) {
      setFpError(err.response?.data?.detail || 'Failed to send OTP');
    } finally { setFpLoading(false); }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setFpLoading(true); setFpError('');
    try {
      await authAPI.resetPassword(fpEmail, fpOtp, fpNewPass);
      setFpMsg('Password reset successfully! You can now log in.');
      setFpStep(null);
      setTimeout(() => { setFpStep(null); setFpEmail(''); setFpOtp(''); setFpNewPass(''); setFpMsg(''); }, 2000);
    } catch (err) {
      setFpError(err.response?.data?.detail || 'Failed to reset password');
    } finally { setFpLoading(false); }
  };

  const cfg = mode ? (mode === 'admin'
    ? { label: 'Dept. Admin', icon: '🔐', grad: 'linear-gradient(135deg,#e74c3c,#c0392b)', shadow: 'rgba(231,76,60,0.4)' }
    : { label: ROLES[mode].label, icon: ROLES[mode].icon, grad: 'linear-gradient(135deg,#667eea,#764ba2)', shadow: 'rgba(102,126,234,0.4)' }
  ) : null;

  return (
    <div style={{ ...s.root, background: t.pageBg, fontFamily: "'Segoe UI',sans-serif" }}>

      {/* Day/Night Toggle */}
      <button
        onClick={() => setDark(!dark)}
        style={{ ...s.toggleBtn, background: t.toggleBg, color: t.toggleColor, border: `1px solid ${t.toggleBorder}` }}
        title="Toggle day/night mode"
      >
        {dark ? '☀️ Day' : '🌙 Night'}
      </button>

      {/* Animated SVG background */}
      <svg style={s.bgSvg} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g1" cx="20%" cy="20%" r="60%">
            <stop offset="0%" stopColor={dark ? '#667eea' : '#667eea'} stopOpacity={dark ? '0.25' : '0.15'}/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          <radialGradient id="g2" cx="80%" cy="80%" r="55%">
            <stop offset="0%" stopColor={dark ? '#764ba2' : '#764ba2'} stopOpacity={dark ? '0.22' : '0.12'}/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          <radialGradient id="g3" cx="60%" cy="10%" r="40%">
            <stop offset="0%" stopColor={dark ? '#f093fb' : '#a78bfa'} stopOpacity={dark ? '0.12' : '0.1'}/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          <style>{`
            @keyframes floatA { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-22px) rotate(6deg)} }
            @keyframes floatB { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-16px) rotate(-5deg)} }
            @keyframes floatC { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-28px)} }
            @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            @keyframes pulse  { 0%,100%{opacity:0.5} 50%{opacity:1} }
            .fa{animation:floatA 6s ease-in-out infinite}
            .fb{animation:floatB 8s ease-in-out infinite}
            .fc{animation:floatC 7s ease-in-out infinite}
            .sp{animation:spin 18s linear infinite; transform-origin:center}
            .pu{animation:pulse 4s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Gradient blobs */}
        <rect width="1440" height="900" fill="url(#g1)"/>
        <rect width="1440" height="900" fill="url(#g2)"/>
        <rect width="1440" height="900" fill="url(#g3)"/>

        {/* Spinning ring top-left */}
        <g className="sp" style={{transformOrigin:'160px 160px'}}>
          <circle cx="160" cy="160" r="90" fill="none" stroke={dark?'rgba(102,126,234,0.3)':'rgba(102,126,234,0.2)'} strokeWidth="1.5" strokeDasharray="12 8"/>
          <circle cx="160" cy="160" r="60" fill="none" stroke={dark?'rgba(118,75,162,0.2)':'rgba(118,75,162,0.15)'} strokeWidth="1" strokeDasharray="6 10"/>
        </g>
        {/* Spinning ring bottom-right */}
        <g className="sp" style={{transformOrigin:'1280px 740px', animationDirection:'reverse'}}>
          <circle cx="1280" cy="740" r="110" fill="none" stroke={dark?'rgba(102,126,234,0.25)':'rgba(102,126,234,0.15)'} strokeWidth="1.5" strokeDasharray="14 8"/>
          <circle cx="1280" cy="740" r="70" fill="none" stroke={dark?'rgba(240,147,251,0.18)':'rgba(167,139,250,0.15)'} strokeWidth="1" strokeDasharray="8 12"/>
        </g>

        {/* Floating hexagon top-right */}
        <g className="fa" style={{transformOrigin:'1150px 120px'}}>
          <polygon points="1150,80 1180,97 1180,131 1150,148 1120,131 1120,97" fill="none" stroke={dark?'rgba(102,126,234,0.45)':'rgba(102,126,234,0.3)'} strokeWidth="2"/>
          <polygon points="1150,95 1168,105 1168,125 1150,135 1132,125 1132,105" fill={dark?'rgba(102,126,234,0.1)':'rgba(102,126,234,0.07)'}/>
        </g>
        {/* Floating hexagon bottom-left */}
        <g className="fb" style={{transformOrigin:'200px 720px'}}>
          <polygon points="200,685 228,700 228,730 200,745 172,730 172,700" fill="none" stroke={dark?'rgba(118,75,162,0.4)':'rgba(118,75,162,0.25)'} strokeWidth="2"/>
        </g>

        {/* Floating squares */}
        <g className="fb" style={{transformOrigin:'1350px 200px'}}>
          <rect x="1330" y="180" width="40" height="40" rx="6" fill="none" stroke={dark?'rgba(240,147,251,0.35)':'rgba(167,139,250,0.3)'} strokeWidth="1.5" transform="rotate(20,1350,200)"/>
        </g>
        <g className="fa" style={{transformOrigin:'80px 450px'}}>
          <rect x="60" y="430" width="40" height="40" rx="6" fill="none" stroke={dark?'rgba(102,126,234,0.3)':'rgba(102,126,234,0.2)'} strokeWidth="1.5" transform="rotate(-15,80,450)"/>
        </g>
        <g className="fc" style={{transformOrigin:'700px 820px'}}>
          <rect x="680" y="800" width="36" height="36" rx="5" fill="none" stroke={dark?'rgba(118,75,162,0.3)':'rgba(118,75,162,0.2)'} strokeWidth="1.5" transform="rotate(30,700,820)"/>
        </g>

        {/* Floating triangles */}
        <g className="fc" style={{transformOrigin:'400px 100px'}}>
          <polygon points="400,70 425,115 375,115" fill="none" stroke={dark?'rgba(102,126,234,0.35)':'rgba(102,126,234,0.22)'} strokeWidth="1.5"/>
        </g>
        <g className="fa" style={{transformOrigin:'1050px 780px'}}>
          <polygon points="1050,755 1072,795 1028,795" fill="none" stroke={dark?'rgba(240,147,251,0.3)':'rgba(167,139,250,0.25)'} strokeWidth="1.5"/>
        </g>

        {/* Floating dots grid */}
        {[120,240,360,480,600,720,840,960,1080,1200,1320].map((x,i)=>
          [150,300,450,600,750].map((y,j)=>(
            <circle key={`${i}-${j}`} cx={x} cy={y} r="2"
              fill={dark?'rgba(102,126,234,0.2)':'rgba(102,126,234,0.15)'}
              className="pu"
              style={{animationDelay:`${(i+j)*0.3}s`}}/>
          ))
        )}

        {/* Academic icons as text */}
        <text className="fa" x="90" y="200" fontSize="32" opacity={dark?'0.18':'0.12'} fill={dark?'#a78bfa':'#667eea'} style={{transformOrigin:'106px 184px'}}>📖</text>
        <text className="fb" x="1300" y="320" fontSize="28" opacity={dark?'0.18':'0.12'} fill={dark?'#a78bfa':'#667eea'} style={{transformOrigin:'1314px 306px'}}>🎓</text>
        <text className="fc" x="300" y="800" fontSize="26" opacity={dark?'0.15':'0.1'} fill={dark?'#c084fc':'#764ba2'} style={{transformOrigin:'313px 787px'}}>✏️</text>
        <text className="fa" x="1100" y="500" fontSize="30" opacity={dark?'0.15':'0.1'} fill={dark?'#a78bfa':'#667eea'} style={{transformOrigin:'1115px 485px'}}>🔬</text>
        <text className="fb" x="500" y="120" fontSize="24" opacity={dark?'0.15':'0.1'} fill={dark?'#c084fc':'#764ba2'} style={{transformOrigin:'512px 108px'}}>💡</text>
        <text className="fc" x="1380" y="600" fontSize="28" opacity={dark?'0.15':'0.1'} fill={dark?'#a78bfa':'#667eea'} style={{transformOrigin:'1394px 586px'}}>📊</text>
        <text className="fa" x="50" y="650" fontSize="26" opacity={dark?'0.15':'0.1'} fill={dark?'#c084fc':'#764ba2'} style={{transformOrigin:'63px 637px'}}>🧪</text>

        {/* Connecting lines */}
        <line x1="160" y1="160" x2="400" y2="100" stroke={dark?'rgba(102,126,234,0.12)':'rgba(102,126,234,0.08)'} strokeWidth="1" strokeDasharray="4 8"/>
        <line x1="1280" y1="740" x2="1050" y2="780" stroke={dark?'rgba(118,75,162,0.12)':'rgba(118,75,162,0.08)'} strokeWidth="1" strokeDasharray="4 8"/>
        <line x1="1150" y1="120" x2="1300" y2="320" stroke={dark?'rgba(102,126,234,0.1)':'rgba(102,126,234,0.07)'} strokeWidth="1" strokeDasharray="4 8"/>
      </svg>

      {/* Card */}
      <div style={{ ...s.card, background: t.cardBg, border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow }}>

        {/* Logo */}
        <div style={s.logoWrap} onClick={handleLogoClick}>
          <div style={s.logoCircle}>📚</div>
          {showAdminHint && <div style={{ ...s.adminHint, color: t.muted }}>{5 - logoClicks} more clicks…</div>}
        </div>

        <h1 style={{ ...s.title, color: t.heading }}>Academic Evaluation</h1>
        <p style={{ ...s.subtitle, color: t.muted }}>AI-Powered Grading & Assessment Platform</p>

        {/* Role selection */}
        {!mode && (
          <>
            <p style={{ ...s.chooseLabel, color: t.muted }}>Sign in as</p>
            <div style={s.roleRow}>
              {Object.entries(ROLES).map(([key, r]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  style={{ ...s.roleCard, background: t.roleCardBg, border: `1.5px solid ${t.roleCardBorder}` }}
                  onMouseEnter={e => Object.assign(e.currentTarget.style, {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 12px 36px rgba(102,126,234,0.35)',
                    borderColor: '#667eea',
                    background: t.roleCardHoverBg,
                  })}
                  onMouseLeave={e => Object.assign(e.currentTarget.style, {
                    transform: 'translateY(0)',
                    boxShadow: t.roleCardShadow,
                    borderColor: t.roleCardBorder,
                    background: t.roleCardBg,
                  })}
                >
                  <span style={s.roleIcon}>{r.icon}</span>
                  <span style={{ ...s.roleLabel, color: t.heading }}>{r.label}</span>
                  <span style={{ ...s.roleHint, color: t.muted }}>{r.hint}</span>
                </button>
              ))}
            </div>
            <p style={{ ...s.footer, color: t.muted }}>© 2024 Academic Evaluation System</p>
          </>
        )}

        {/* Login form */}
        {mode && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ ...s.formBadge, background: t.badgeBg, border: `1px solid ${t.badgeBorder}` }}>
              <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: t.heading }}>{cfg.label} Login</span>
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            <label style={{ ...s.label, color: t.labelColor }}>Email Address</label>
            <input
              type="email" value={email} required
              placeholder="your@email.com"
              onChange={e => setEmail(e.target.value)}
              style={{ ...s.input, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.inputText }}
              onFocus={e => (e.target.style.borderColor = '#667eea')}
              onBlur={e => (e.target.style.borderColor = t.inputBorder)}
            />

            <label style={{ ...s.label, color: t.labelColor, marginTop: '16px' }}>Password</label>
            <input
              type="password" value={password} required
              placeholder="••••••••"
              onChange={e => setPassword(e.target.value)}
              style={{ ...s.input, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.inputText }}
              onFocus={e => (e.target.style.borderColor = '#667eea')}
              onBlur={e => (e.target.style.borderColor = t.inputBorder)}
            />

            {mode === 'student' && fpStep === null && (
              <button type="button" onClick={() => setFpStep('email')}
                style={{ background: 'none', border: 'none', color: '#667eea', fontSize: '13px', cursor: 'pointer', padding: '6px 0', display: 'block', marginTop: '6px' }}>
                Forgot password?
              </button>
            )}

            {/* Forgot password inline panel */}
            {mode === 'student' && fpStep === 'email' && (
              <form onSubmit={handleForgotSendOtp} style={{ marginTop: '16px', background: t.cardBg === '#ffffff' ? '#f0f2ff' : 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ margin: '0 0 10px', fontWeight: '600', fontSize: '14px', color: t.heading }}>🔑 Reset Password</p>
                {fpError && <div style={s.errorBox}>{fpError}</div>}
                {fpMsg && <div style={{ ...s.errorBox, background: 'rgba(39,174,96,0.12)', borderColor: 'rgba(39,174,96,0.35)', color: '#27ae60' }}>{fpMsg}</div>}
                <input type="email" required placeholder="Enter your registered email" value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  style={{ ...s.input, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.inputText, marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={fpLoading}
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                    {fpLoading ? 'Sending…' : 'Send OTP'}
                  </button>
                  <button type="button" onClick={() => { setFpStep(null); setFpError(''); setFpMsg(''); }}
                    style={{ padding: '10px 14px', background: 'none', border: `1px solid ${t.inputBorder}`, borderRadius: '8px', cursor: 'pointer', color: t.heading }}>Cancel</button>
                </div>
              </form>
            )}

            {mode === 'student' && fpStep === 'otp' && (
              <form onSubmit={handleForgotReset} style={{ marginTop: '16px', background: t.cardBg === '#ffffff' ? '#f0f2ff' : 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ margin: '0 0 10px', fontWeight: '600', fontSize: '14px', color: t.heading }}>🔐 Enter OTP & New Password</p>
                {fpError && <div style={s.errorBox}>{fpError}</div>}
                {fpMsg && <div style={{ ...s.errorBox, background: 'rgba(39,174,96,0.12)', borderColor: 'rgba(39,174,96,0.35)', color: '#27ae60' }}>{fpMsg}</div>}
                <input type="text" required placeholder="6-digit OTP" value={fpOtp} maxLength={6}
                  onChange={e => setFpOtp(e.target.value)}
                  style={{ ...s.input, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.inputText, marginBottom: '10px', letterSpacing: '6px', textAlign: 'center', fontSize: '20px' }} />
                <input type="password" required placeholder="New password (min 6 chars)" value={fpNewPass}
                  onChange={e => setFpNewPass(e.target.value)}
                  style={{ ...s.input, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.inputText, marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={fpLoading}
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                    {fpLoading ? 'Resetting…' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => setFpStep('email')}
                    style={{ padding: '10px 14px', background: 'none', border: `1px solid ${t.inputBorder}`, borderRadius: '8px', cursor: 'pointer', color: t.heading }}>Back</button>
                </div>
              </form>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...s.submitBtn, background: cfg.grad, boxShadow: `0 6px 20px ${cfg.shadow}`, opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'Signing in…' : `Sign in as ${cfg.label}`}
            </button>

            <button
              style={{ ...s.backBtn, color: t.muted }}
              onClick={back}
              onMouseEnter={e => (e.target.style.color = '#667eea')}
              onMouseLeave={e => (e.target.style.color = t.muted)}
            >
              ← Back to role selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared static styles ── */
const s = {
  root: {
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', transition: 'background 0.4s',
  },
  toggleBtn: {
    position: 'absolute', top: '20px', right: '24px',
    padding: '8px 16px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.3s', zIndex: 10,
  },
  bgSvg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 0,
  },
  card: {
    position: 'relative', zIndex: 1,
    borderRadius: '24px', padding: '48px 44px 40px',
    width: '100%', maxWidth: '480px',
    textAlign: 'center', transition: 'background 0.4s, border 0.4s, box-shadow 0.4s',
  },
  logoWrap: { cursor: 'pointer', display: 'inline-block', marginBottom: '16px', position: 'relative' },
  logoCircle: {
    width: '72px', height: '72px', borderRadius: '50%',
    background: 'linear-gradient(135deg,#667eea,#764ba2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '34px', margin: '0 auto',
    boxShadow: '0 8px 24px rgba(102,126,234,0.45)',
  },
  adminHint: {
    position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)',
    fontSize: '11px', whiteSpace: 'nowrap',
  },
  title: { fontSize: '26px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.3px' },
  subtitle: { fontSize: '13px', margin: '0 0 32px' },
  chooseLabel: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '18px' },
  roleRow: { display: 'flex', gap: '16px', marginBottom: '32px' },
  roleCard: {
    flex: 1, padding: '24px 16px', borderRadius: '16px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s',
  },
  roleIcon: { fontSize: '36px' },
  roleLabel: { fontSize: '16px', fontWeight: '700' },
  roleHint: { fontSize: '11px', textAlign: 'center', lineHeight: '1.4' },
  footer: { fontSize: '12px', margin: 0 },
  formBadge: {
    display: 'flex', alignItems: 'center', gap: '10px',
    borderRadius: '10px', padding: '10px 16px', marginBottom: '20px',
  },
  errorBox: {
    background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.35)',
    color: '#e74c3c', borderRadius: '8px', padding: '10px 14px',
    fontSize: '13px', marginBottom: '16px',
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' },
  input: {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    width: '100%', marginTop: '24px', padding: '14px',
    color: 'white', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  backBtn: {
    marginTop: '14px', background: 'none', border: 'none',
    fontSize: '13px', cursor: 'pointer', padding: '4px 0',
    display: 'block', transition: 'color 0.2s',
  },
};

/* ── Light (day) tokens — clean white + project purple accent ── */
const lightTokens = {
  pageBg: 'linear-gradient(135deg,#f0f2ff 0%,#faf5ff 50%,#f0f4ff 100%)',
  cardBg: '#ffffff',
  cardBorder: 'rgba(102,126,234,0.18)',
  cardShadow: '0 20px 60px rgba(102,126,234,0.18)',
  heading: '#1a1a2e',
  muted: '#888',
  labelColor: '#444',
  roleCardBg: '#f7f8ff',
  roleCardBorder: '#e0e4ff',
  roleCardHoverBg: '#eef1ff',
  roleCardShadow: '0 4px 16px rgba(102,126,234,0.1)',
  badgeBg: '#f0f2ff',
  badgeBorder: '#d0d5ff',
  inputBg: '#f7f8ff',
  inputBorder: '#d0d5ff',
  inputText: '#1a1a2e',
  toggleBg: '#1a1a2e',
  toggleColor: '#fff',
  toggleBorder: '#1a1a2e',
};

/* ── Dark (night) tokens — deep navy + project purple glow ── */
const darkTokens = {
  pageBg: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.1)',
  cardShadow: '0 24px 64px rgba(0,0,0,0.55)',
  heading: '#ffffff',
  muted: 'rgba(255,255,255,0.42)',
  labelColor: 'rgba(255,255,255,0.6)',
  roleCardBg: 'rgba(255,255,255,0.06)',
  roleCardBorder: 'rgba(255,255,255,0.1)',
  roleCardHoverBg: 'rgba(102,126,234,0.15)',
  roleCardShadow: '0 4px 24px rgba(0,0,0,0.35)',
  badgeBg: 'rgba(255,255,255,0.07)',
  badgeBorder: 'rgba(255,255,255,0.12)',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.14)',
  inputText: '#ffffff',
  toggleBg: 'rgba(255,255,255,0.1)',
  toggleColor: '#fff',
  toggleBorder: 'rgba(255,255,255,0.2)',
};

export default Login;
