import React, { useState } from 'react';
import { Mail, Lock, User, CheckCircle, ShieldAlert, Sparkles, ArrowRight, ShieldCheck, Phone } from 'lucide-react';
import { dbOps } from '../utils/mockDb';

export default function Auth({ onLoginSuccess, toast }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // Minor loading animation delay
    setTimeout(() => {
      try {
        if (isLoginTab) {
          if (!email || !password) {
            throw new Error('Please fill in all credentials.');
          }
          const user = dbOps.login(email, password);
          onLoginSuccess(user);
        } else {
          if (!name || !email || !password || !phone) {
            throw new Error('All registration fields are required.');
          }
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
          }
          const user = dbOps.register(name, email, password, phone);
          onLoginSuccess(user);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Authentication failed. Please check your inputs.');
        toast(`Error: ${err.message || 'Auth Failed'} ⚠️`);
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--auth-bg-gradient)',
        fontFamily: 'var(--font-body)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowX: 'hidden'
      }}
    >
      {/* Visual Backdrops / Decorative Bubbles */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: '180px', height: '180px', borderRadius: '50%', background: 'var(--glass-bubble-bg-1)', filter: 'blur(40px)', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', bottom: '15%', right: '8%', width: '250px', height: '250px', borderRadius: '50%', background: 'var(--glass-bubble-bg-2)', filter: 'blur(50px)', zIndex: 0 }}></div>

      {/* Main Container Layout */}
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          zIndex: 1,
          animation: 'modal-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '22px',
                boxShadow: '0 8px 16px rgba(29, 158, 117, 0.2)'
              }}
            >
              R
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
              RentIt
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '500' }}>
            Trust-based peer-to-peer neighborhood sharing & rental platform.
          </p>
        </div>

        {/* Premium Centered Auth Form Gateway */}
        <div
          style={{
            background: 'var(--card-bg-glass)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: 'var(--card-border-glass)',
            borderRadius: '24px',
            padding: '32px 28px',
            boxShadow: 'var(--shadow-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* Tabs Trigger Navigation */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: '9999px',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: isLoginTab ? 'var(--bg-secondary)' : 'transparent',
                color: isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '14px',
                borderRadius: '9999px',
                padding: '10px 0',
                cursor: 'pointer',
                boxShadow: isLoginTab ? '0 4px 12px rgba(0,0,0,0.04)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: !isLoginTab ? 'var(--bg-secondary)' : 'transparent',
                color: !isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '14px',
                borderRadius: '9999px',
                padding: '10px 0',
                cursor: 'pointer',
                boxShadow: !isLoginTab ? '0 4px 12px rgba(0,0,0,0.04)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              New Account
            </button>
          </div>

          {/* Explanatory Header */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLoginTab ? 'Welcome Back!' : 'Join the Neighborhood'}
              <Sparkles size={16} color="var(--accent-color)" />
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isLoginTab
                ? 'Sign in to access your dashboard, listing items, and messages.'
                : 'Create a free account to borrow from & lend tools with neighbors.'}
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--status-danger-light)',
                color: 'var(--status-danger)',
                fontSize: '13px',
                fontWeight: '600',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                animation: 'modal-appear 0.2s ease'
              }}
            >
              <ShieldAlert size={18} flexShrink={0} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Core Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {!isLoginTab && (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-name">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      id="register-name"
                      className="form-control"
                      placeholder="Rahul Sharma"
                      style={{ paddingLeft: '48px', height: '48px' }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-phone">Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      type="tel"
                      id="register-phone"
                      className="form-control"
                      placeholder="e.g. +91 98765 43210"
                      style={{ paddingLeft: '48px', height: '48px' }}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  id="auth-email"
                  className="form-control"
                  placeholder="email@rentit.in"
                  style={{ paddingLeft: '48px', height: '48px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  id="auth-password"
                  className="form-control"
                  placeholder="••••••••"
                  style={{ paddingLeft: '48px', height: '48px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit Trigger */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                height: '48px',
                width: '100%',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: '700',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <span>Securing Session... ⏳</span>
              ) : (
                <>
                  <span>{isLoginTab ? 'Log In Securely' : 'Complete Registration'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </form>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={14} color="var(--accent-color)" />
            <span>Neighbor trust identities verified via encrypted mock session keys.</span>
          </div>

        </div>

      </div>
    </div>
  );
}
