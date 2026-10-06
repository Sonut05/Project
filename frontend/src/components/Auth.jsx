import { useState, useEffect } from 'react';
import { Mail, Lock, User, ShieldAlert, Sparkles, ArrowRight, ShieldCheck, Phone, Eye, EyeOff, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { geocodeApi } from '../api/geocode.js';

export default function Auth({ onLoginSuccess, toast }) {
  const { login, register } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isLocatingCity, setIsLocatingCity] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debounced geocoding search for city during registration
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (isLoginTab || !city.trim() || city.trim().length < 2) {
        setCitySuggestions([]);
        return;
      }
      try {
        const results = await geocodeApi.search(city, controller.signal);
        setCitySuggestions(results || []);
      } catch {
        // Ignored
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [city, isLoginTab]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingCity(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        try {
          const rev = await geocodeApi.reverse(lat, lng);
          const resolvedCity = rev?.city || rev?.label;
          if (resolvedCity) {
            setCity(resolvedCity);
          }
        } catch {
          // Ignored
        } finally {
          setIsLocatingCity(false);
        }
      },
      () => {
        setIsLocatingCity(false);
        setErrorMsg('Could not detect location. Please type your city name.');
      },
      { timeout: 10000 }
    );
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isLoginTab) {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }
    } else {
      if (!name.trim() || !email.trim() || !password) {
        setErrorMsg('Name, email, and password are required.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLoginTab) {
        const loggedInUser = await login(email.trim(), password);
        if (toast) toast('Logged in successfully! Welcome back 👋');
        if (onLoginSuccess) onLoginSuccess(loggedInUser);
      } else {
        let finalLat = coords.lat;
        let finalLng = coords.lng;
        let finalCity = city.trim();

        // If user typed a city without selecting a dropdown, auto-geocode on submit
        if (finalCity && (finalLat === null || finalLng === null)) {
          try {
            const results = await geocodeApi.search(finalCity);
            if (results && results.length > 0) {
              finalLat = results[0].latitude;
              finalLng = results[0].longitude;
              finalCity = results[0].city || results[0].label || finalCity;
            }
          } catch {
            // Server will attempt fallback geocoding
          }
        }

        const registeredUser = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          phone: phone.trim() || undefined,
          city: finalCity || undefined,
          latitude: finalLat ?? undefined,
          longitude: finalLng ?? undefined
        });
        if (toast) toast('Account created! Welcome to RentIt 🎉');
        if (onLoginSuccess) onLoginSuccess(registeredUser);
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMsg(msg);
      if (toast) toast(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        background: 'var(--auth-bg-gradient)',
        fontFamily: 'var(--font-body)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      {/* Decorative Bubbles */}
      <div
        style={{
          position: 'fixed',
          top: '10%',
          left: '5%',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'var(--glass-bubble-bg-1)',
          filter: 'blur(40px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '15%',
          right: '8%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'var(--glass-bubble-bg-2)',
          filter: 'blur(50px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          zIndex: 1
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
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: 'var(--text-xl)',
                boxShadow: '0 8px 16px rgba(29, 158, 117, 0.2)'
              }}
            >
              R
            </div>
            <h1
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: '800',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.5px',
                margin: 0
              }}
            >
              RentIt
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: '500', margin: 0 }}>
            Peer-to-peer neighborhood sharing & rental platform.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--card-bg-glass)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: 'var(--card-border-glass)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 28px',
            boxShadow: 'var(--shadow-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: 'var(--radius-full)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsLoginTab(true);
                setErrorMsg('');
              }}
              style={{
                flex: 1,
                border: 'none',
                background: isLoginTab ? 'var(--bg-secondary)' : 'transparent',
                color: isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: isLoginTab ? '700' : '500',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-full)',
                padding: '8px 0',
                cursor: 'pointer',
                boxShadow: isLoginTab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              aria-label="New Neighbor Registration"
              onClick={() => {
                setIsLoginTab(false);
                setErrorMsg('');
              }}
              style={{
                flex: 1,
                border: 'none',
                background: !isLoginTab ? 'var(--bg-secondary)' : 'transparent',
                color: !isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: !isLoginTab ? '700' : '500',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-full)',
                padding: '8px 0',
                cursor: 'pointer',
                boxShadow: !isLoginTab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Create Account
            </button>
          </div>

          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '700',
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 0 4px 0'
              }}
            >
              {isLoginTab ? 'Welcome Back!' : 'Create Neighbor Account'}
              <Sparkles size={16} color="var(--accent-color)" />
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              {isLoginTab
                ? 'Sign in to access your listings, rentals, and messages.'
                : 'Create an account to borrow and share items with your neighbors.'}
            </p>
          </div>

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
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
            >
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLoginTab && (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-name">
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      id="register-name"
                      className="form-control"
                      placeholder="e.g. Alex Rivers"
                      style={{ paddingLeft: '48px', height: '46px' }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="register-phone">
                    Phone Number (Optional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="tel"
                      id="register-phone"
                      className="form-control"
                      placeholder="e.g. +91 98765 43210"
                      style={{ paddingLeft: '48px', height: '46px' }}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" htmlFor="register-city" style={{ margin: 0 }}>
                      City / Neighborhood
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocatingCity}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-color)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      <Navigation size={13} />
                      {isLocatingCity ? 'Detecting...' : 'Use GPS'}
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <MapPin
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      id="register-city"
                      className="form-control"
                      placeholder="e.g. Bengaluru, Indiranagar, Waghodia"
                      style={{ paddingLeft: '48px', height: '46px' }}
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setCoords({ lat: null, lng: null });
                        setShowCitySuggestions(true);
                      }}
                      onFocus={() => setShowCitySuggestions(true)}
                    />
                  </div>

                  {coords.lat !== null && coords.lng !== null && (
                    <span style={{ fontSize: '11px', color: 'var(--status-success)', marginTop: '4px', display: 'block' }}>
                      ✓ Location verified
                    </span>
                  )}

                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <ul
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-md)',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        zIndex: 20,
                        listStyle: 'none',
                        padding: '4px 0',
                        margin: '4px 0 0 0'
                      }}
                    >
                      {citySuggestions.map((s, idx) => (
                        <li
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                          }}
                          onMouseDown={() => {
                            setCity(s.city || s.label);
                            setCoords({ lat: s.latitude, lng: s.longitude });
                            setShowCitySuggestions(false);
                          }}
                        >
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="auth-email">
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="email"
                  id="auth-email"
                  className="form-control"
                  placeholder="name@example.com"
                  style={{ paddingLeft: '48px', height: '46px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="auth-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-password"
                  className="form-control"
                  placeholder="At least 6 characters"
                  style={{ paddingLeft: '48px', paddingRight: '48px', height: '46px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLoginTab && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="register-confirm-password">
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="register-confirm-password"
                    className="form-control"
                    placeholder="Repeat password"
                    style={{ paddingLeft: '48px', height: '46px' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                height: '48px',
                width: '100%',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: '700',
                gap: '8px',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <span>Please wait...</span>
              ) : (
                <>
                  <span>{isLoginTab ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              fontSize: 'var(--text-xs)',
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
            <ShieldCheck size={16} color="var(--accent-color)" />
            <span>Passwords are securely hashed on the server.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
