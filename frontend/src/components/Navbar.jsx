import React, { useState, useEffect } from 'react';
import { Home, Search, Box, Bell, User, History, Share2, LogOut, Sun, Moon } from 'lucide-react';
import { getDb, dbOps } from '../utils/mockDb';

export default function Navbar({ activePage, setActivePage, theme, toggleTheme }) {
  const [pendingCount, setPendingCount] = useState(0);

  const checkPendingRequests = () => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    // Count incoming requests that are 'Pending'
    const count = db.requests.filter(
      (req) => req.lenderId === activeUserId && req.status === 'Pending'
    ).length;
    setPendingCount(count);
  };

  useEffect(() => {
    checkPendingRequests();

    // Listen to mock DB updates to refresh badges reactively
    window.addEventListener('rentit_db_update', checkPendingRequests);
    return () => {
      window.removeEventListener('rentit_db_update', checkPendingRequests);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'browse', label: 'Browse', icon: Search },
    { id: 'my-items', label: 'My Items', icon: Box },
    { id: 'requests', label: 'Requests', icon: Bell, badge: true },
    { id: 'history', label: 'History', icon: History, desktopOnly: false }, // history is accessible from primary sidebar!
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <nav
        className="no-print"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '260px',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'none',
          flexDirection: 'column',
          padding: '24px 16px',
          zIndex: 900,
        }}
        // Handled via custom css fallback or inline flex inside js media queries
        ref={(el) => {
          if (el) {
            el.style.setProperty('display', window.innerWidth >= 1024 ? 'flex' : 'none');
          }
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 8px', marginBottom: '32px' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'var(--bg-secondary)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            R
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
              RentIt
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
              Neighbor Sharing Platform
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--accent-color-light)' : 'transparent',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '15px',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  position: 'relative',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '16px',
                      backgroundColor: 'var(--status-danger)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      minWidth: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Theme Toggle option */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            textAlign: 'left',
            transition: 'all var(--transition-fast)',
            marginBottom: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={20} strokeWidth={2} style={{ color: '#F59E0B' }} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={20} strokeWidth={2} style={{ color: '#6366F1' }} />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Logout button */}
        <button
          onClick={() => {
            dbOps.logout();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--status-danger)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            textAlign: 'left',
            transition: 'all var(--transition-fast)',
            marginBottom: '12px',
          }}
        >
          <LogOut size={20} strokeWidth={2} />
          <span>Log Out</span>
        </button>

        {/* Footer in sidebar */}
        <div
          style={{
            padding: '16px 8px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          Made for easy sharing 🤝
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '76px',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 8px',
          zIndex: 900,
          boxShadow: '0 -4px 16px rgba(29, 158, 117, 0.05)',
        }}
        // Responsive visibility helper
        ref={(el) => {
          if (el) {
            el.style.setProperty('display', window.innerWidth < 1024 ? 'flex' : 'none');
          }
        }}
      >
        {/* We exclude history from bottom mobile nav to fit spacing nicely, 
            but it is accessible on mobile via the profile or history button! */}
        {navItems
          .filter((i) => i.id !== 'history')
          .map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '11px',
                  width: '64px',
                  height: '100%',
                  padding: '4px 0',
                  gap: '4px',
                  position: 'relative',
                  transition: 'color var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isActive ? 'var(--accent-color-light)' : 'transparent',
                    width: '48px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span>{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '12px',
                      backgroundColor: 'var(--status-danger)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        {/* Quick access trigger for History on Mobile */}
        <button
          onClick={() => setActivePage('history')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: activePage === 'history' ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activePage === 'history' ? '700' : '500',
            fontSize: '11px',
            width: '64px',
            height: '100%',
            padding: '4px 0',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activePage === 'history' ? 'var(--accent-color-light)' : 'transparent',
              width: '48px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <History size={20} />
          </div>
          <span>History</span>
        </button>
      </nav>

      {/* Resize listener to toggle visibility reactively */}
      <ResizeListener />
    </>
  );
}

// Inline component to attach responsive resize listener and guarantee state updates
function ResizeListener() {
  useEffect(() => {
    const handleResize = () => {
      const sb = document.querySelector('nav[style*="left: 0"]');
      const mb = document.querySelector('nav[style*="bottom: 0"]');
      if (sb) {
        sb.style.display = window.innerWidth >= 1024 ? 'flex' : 'none';
      }
      if (mb) {
        mb.style.display = window.innerWidth < 1024 ? 'flex' : 'none';
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return null;
}
