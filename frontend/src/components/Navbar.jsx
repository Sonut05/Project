import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Box, Bell, User, History, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { requestsApi } from '../api/requests.js';

export default function Navbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function fetchPendingCount() {
      try {
        const incoming = await requestsApi.getIncoming();
        if (isMounted) {
          const count = incoming.filter((r) => r.status === 'Pending').length;
          setPendingCount(count);
        }
      } catch {
        // Silently ignore background badge errors
      }
    }

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000); // refresh badge every 15s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, location.pathname]);

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/browse', label: 'Browse', icon: Search },
    { to: '/my-items', label: 'My Items', icon: Box },
    { to: '/requests', label: 'Requests', icon: Bell, badge: true },
    { to: '/history', label: 'History', icon: History },
    { to: '/profile', label: 'Profile', icon: User }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/browse');
  };

  const isItemActive = (item) => {
    if (location.pathname === item.to) return true;
    if (item.to === '/dashboard' && location.pathname === '/') return true;
    if (item.to === '/browse' && (location.pathname.startsWith('/browse') || location.pathname.startsWith('/items'))) return true;
    if (item.to === '/my-items' && location.pathname.startsWith('/my-items')) return true;
    if (item.to === '/profile' && location.pathname.startsWith('/profile')) return true;
    if (item.to === '/requests' && location.pathname.startsWith('/requests')) return true;
    if (item.to === '/history' && location.pathname.startsWith('/history')) return true;
    return false;
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <nav className="desktop-sidebar no-print" aria-label="Main Navigation">
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 8px', marginBottom: '32px' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            R
          </div>
          <div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: '700',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.5px',
                display: 'block',
                lineHeight: '1.2'
              }}
            >
              RentIt
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              Neighbor Sharing Platform
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-full)',
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'var(--accent-color-light)' : 'transparent',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '15px',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  position: 'relative',
                  borderLeft: isActive ? '4px solid var(--accent-color)' : '4px solid transparent'
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
                      padding: '2px'
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle visual theme"
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
            marginBottom: '8px'
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

        {/* User profile / Logout */}
        {user ? (
          <button
            onClick={handleLogout}
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
              marginBottom: '12px'
            }}
          >
            <LogOut size={20} strokeWidth={2} />
            <span>Log Out</span>
          </button>
        ) : (
          <NavLink
            to="/browse"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '10px 16px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              marginBottom: '12px'
            }}
          >
            Sign In / Join
          </NavLink>
        )}

        <div
          style={{
            padding: '16px 8px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}
        >
          P2P Daily Item Rental 🤝
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="mobile-bottom-nav no-print" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '11px',
                width: '60px',
                height: '100%',
                padding: '4px 0',
                gap: '4px',
                position: 'relative'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? 'var(--accent-color-light)' : 'transparent',
                  width: '44px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  transition: 'background-color var(--transition-fast)'
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
                    right: '10px',
                    backgroundColor: 'var(--status-danger)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
