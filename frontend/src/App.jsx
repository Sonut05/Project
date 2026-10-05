import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Onboarding from './components/Onboarding';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import ItemDetail from './pages/ItemDetail';
import MyItems from './pages/MyItems';
import Requests from './pages/Requests';
import History from './pages/History';
import ProfileView from './components/ProfileView';
import AddEditItemModal from './components/AddEditItemModal';
import Auth from './components/Auth';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import { Sun, Moon } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('rentit_theme') || 'light';
  });

  // Modal states
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const root = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('rentit_theme', theme);
  }, [theme]);

  const showToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      showToast(`Switched to ${next === 'dark' ? 'Midnight Dark 🌙' : 'Sunny Light ☀️'} Mode!`);
      return next;
    });
  };

  const handleOpenAddListing = () => {
    setEditingItem(null);
    setIsAddListingOpen(true);
  };

  const handleOpenEditListing = (item) => {
    setEditingItem(item);
    setIsAddListingOpen(true);
  };

  const handleSaveListing = () => {
    setIsAddListingOpen(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>Loading RentIt...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render login/register interface
  if (!user) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <button 
          onClick={toggleTheme} 
          className="theme-floating-toggle no-print" 
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} style={{ color: '#F59E0B' }} aria-hidden="true" /> : <Moon size={20} style={{ color: '#6366F1' }} aria-hidden="true" />}
        </button>

        <Auth 
          onLoginSuccess={(loggedInUser) => {
            showToast(`Welcome back, ${loggedInUser.name}! 👋`);
            navigate('/dashboard');
          }} 
          toast={showToast}
        />

        {toastMessage && (
          <div className="toast-container no-print">
            <div className="toast">
              <span>✨</span>
              <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{toastMessage}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If user has not completed onboarding
  if (!user.onboardingCompletedAt) {
    return (
      <div className="app-container">
        <Onboarding onComplete={() => showToast('Profile setup complete! Welcome to RentIt 🤝')} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Navigation */}
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      {/* Main Routes */}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <Dashboard 
              onOpenAddListing={handleOpenAddListing}
              toast={showToast}
            />
          } 
        />
        <Route 
          path="/browse" 
          element={<Browse toast={showToast} />} 
        />
        <Route 
          path="/items/:id" 
          element={<ItemDetail toast={showToast} />} 
        />
        <Route 
          path="/my-items" 
          element={
            <MyItems 
              onOpenAddListing={handleOpenAddListing}
              onOpenEditListing={handleOpenEditListing}
              toast={showToast}
            />
          } 
        />
        <Route 
          path="/requests" 
          element={<Requests toast={showToast} />} 
        />
        <Route 
          path="/history" 
          element={<History toast={showToast} />} 
        />
        <Route 
          path="/profile" 
          element={<ProfileView userId={user.id} toast={showToast} />} 
        />
        <Route 
          path="/profile/:id" 
          element={<ProfileView toast={showToast} />} 
        />

        {/* 404 Route */}
        <Route 
          path="*" 
          element={
            <div className="main-content" style={{ textAlign: 'center', padding: '80px 20px' }}>
              <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'var(--accent-color)' }}>404</h1>
              <h2 style={{ marginTop: '12px', marginBottom: '8px' }}>Page Not Found</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>The requested route does not exist.</p>
              <Link to="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                Return to Dashboard
              </Link>
            </div>
          } 
        />
      </Routes>

      {/* Global Add/Edit Listing Modal */}
      {isAddListingOpen && (
        <AddEditItemModal 
          item={editingItem}
          onClose={() => {
            setIsAddListingOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveListing}
          toast={showToast}
        />
      )}

      {/* Dynamic Toast Alerts */}
      {toastMessage && (
        <div className="toast-container no-print">
          <div className="toast">
            <span>✨</span>
            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
