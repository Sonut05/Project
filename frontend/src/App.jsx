import React, { useState, useEffect } from 'react';
import { getDb, dbOps } from './utils/mockDb';
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
import { Sparkles, Info, X, Sun, Moon } from 'lucide-react';

function App() {
  const [db, setDb] = useState(getDb());
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('rentit_theme') || 'light';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const root = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('rentit_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      showToast(`Switched to ${next === 'dark' ? 'Midnight Dark 🌙' : 'Sunny Light ☀️'} Mode!`);
      return next;
    });
  };

  const [currentUser, setCurrentUser] = useState(() => {
    const initialDb = getDb();
    return initialDb.currentUserId ? initialDb.users[initialDb.currentUserId] : null;
  });
  
  // Navigation & Page State
  const [activePage, setActivePage] = useState('dashboard');
  const [activeItemId, setActiveItemId] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);

  // Modals & Popups
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  const refreshDbState = () => {
    const updatedDb = getDb();
    setDb(updatedDb);
    const activeUserId = updatedDb.currentUserId;
    if (activeUserId) {
      setCurrentUser(updatedDb.users[activeUserId]);
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    refreshDbState();
    
    // Listen for mock DB changes reactively
    window.addEventListener('rentit_db_update', refreshDbState);
    
    // Simulate natural greeting/login trigger logic on start
    dbOps.incrementLogin();

    return () => {
      window.removeEventListener('rentit_db_update', refreshDbState);
    };
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    // Dismiss after 4 seconds automatically
    setTimeout(() => {
      setToastMessage((curr) => (curr === message ? null : curr));
    }, 4000);
  };

  const handleOnboardingComplete = (updatedUser) => {
    setCurrentUser(updatedUser);
    refreshDbState();
    showToast('Welcome to the RentIt family! Try browsing nearby items or listing your first tool! 🤝');
  };

  const handleSaveListing = () => {
    refreshDbState();
    setEditingItem(null);
  };

  // Dynamic Routing Engine
  const renderMainPage = () => {
    if (activeItemId) {
      return (
        <ItemDetail 
          itemId={activeItemId} 
          onBack={() => setActiveItemId(null)}
          onViewUser={(uid) => setActiveProfileId(uid)}
          toast={showToast}
        />
      );
    }

    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard 
            onViewUser={(uid) => setActiveProfileId(uid)}
            onNavigatePage={(page) => {
              setActivePage(page);
              setActiveItemId(null);
            }}
            onOpenAddListing={() => {
              setEditingItem(null);
              setIsAddListingOpen(true);
            }}
            toast={showToast}
          />
        );
      case 'browse':
        return (
          <Browse 
            onViewItem={(id) => setActiveItemId(id)}
            onViewUser={(uid) => setActiveProfileId(uid)}
            toast={showToast}
          />
        );
      case 'my-items':
        return (
          <MyItems 
            onOpenAddListing={() => {
              setEditingItem(null);
              setIsAddListingOpen(true);
            }}
            onOpenEditListing={(item) => {
              setEditingItem(item);
              setIsAddListingOpen(true);
            }}
            onViewUser={(uid) => setActiveProfileId(uid)}
            onViewItem={(id) => setActiveItemId(id)}
            toast={showToast}
          />
        );
      case 'requests':
        return (
          <Requests 
            onViewUser={(uid) => setActiveProfileId(uid)}
            onViewItem={(id) => setActiveItemId(id)}
            toast={showToast}
          />
        );
      case 'history':
        return (
          <History 
            onViewUser={(uid) => setActiveProfileId(uid)}
            onViewItem={(id) => setActiveItemId(id)}
            toast={showToast}
          />
        );
      case 'profile':
        return (
          <ProfileView 
            userId={currentUser?.id || "user-self"}
            toast={showToast}
            onNavigateItem={(id) => setActiveItemId(id)}
            onNavigatePage={(page) => {
              setActivePage(page);
              setActiveItemId(null);
            }}
          />
        );
      default:
        return <div className="main-content">Oops! Page not found.</div>;
    }
  };

  if (!currentUser) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Floating Theme Toggle for Login Screen */}
        <button 
          onClick={toggleTheme} 
          className="theme-floating-toggle no-print" 
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} style={{ color: '#F59E0B' }} /> : <Moon size={20} style={{ color: '#6366F1' }} />}
        </button>
        <Auth 
          onLoginSuccess={(user) => {
            refreshDbState();
            showToast(`Welcome back, ${user.name}! 👋`);
          }} 
          toast={showToast}
        />
        {/* Success/Feedback dynamic Toast system alerts */}
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

  return (
    <div className="app-container">
      
      {/* Floating Theme Toggle for Mobile Logged-in View */}
      {isMobile && (
        <button 
          onClick={toggleTheme} 
          className="theme-floating-toggle no-print" 
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} style={{ color: '#F59E0B' }} /> : <Moon size={20} style={{ color: '#6366F1' }} />}
        </button>
      )}

      {/* 1. Onboarding Overlay Trigger */}
      {currentUser && !currentUser.hasCompletedOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* 2. Navigation Sidebar & bottom-nav */}
      {currentUser && currentUser.hasCompletedOnboarding && (
        <Navbar 
          activePage={activeItemId ? 'browse' : activePage} 
          setActivePage={(page) => {
            setActivePage(page);
            setActiveItemId(null); // Return to default list context on page clicks
          }}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 3. Core App Layout pages */}
      {currentUser && currentUser.hasCompletedOnboarding && renderMainPage()}

      {/* 4. Global Add/Edit listing form modal popup */}
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

      {/* 5. Public profile overlay modal popup */}
      {activeProfileId && (
        <div className="modal-overlay no-print" style={{ zIndex: 1100, padding: '24px' }}>
          <div style={{ maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderRadius: '24px' }}>
            <ProfileView 
              userId={activeProfileId} 
              onClose={() => setActiveProfileId(null)}
              toast={showToast}
              onNavigateItem={(id) => setActiveItemId(id)}
              onNavigatePage={(page) => {
                setActivePage(page);
                setActiveItemId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 6. Success/Feedback dynamic Toast system alerts */}
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

export default App;
