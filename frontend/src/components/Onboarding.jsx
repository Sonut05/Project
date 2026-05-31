import React, { useState } from 'react';
import { getDb, dbOps, getCoordinatesForAddress } from '../utils/mockDb';
import { Sparkles, ArrowRight, User, MapPin, CheckCircle, Search, Box, MessageSquare, History } from 'lucide-react';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
];

const FALLBACK_CITIES = [
  { name: "Bangalore, Karnataka", lat: 12.9716, lng: 77.5946 },
  { name: "Mumbai, Maharashtra", lat: 19.0760, lng: 72.8777 },
  { name: "Delhi, NCR", lat: 28.6139, lng: 77.2090 },
  { name: "Hyderabad, Telangana", lat: 17.3850, lng: 78.4867 },
  { name: "Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { name: "Pune, Maharashtra", lat: 18.5204, lng: 73.8567 },
  { name: "Kolkata, West Bengal", lat: 22.5726, lng: 88.3639 },
  { name: "Ahmedabad, Gujarat", lat: 23.0225, lng: 72.5714 },
  { name: "Vadodara, Gujarat", lat: 22.3072, lng: 73.1812 },
  { name: "Jaipur, Rajasthan", lat: 26.9124, lng: 75.7873 },
  { name: "Noida, Uttar Pradesh", lat: 28.5355, lng: 77.3910 }
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => {
    const db = getDb();
    const currentUser = db.users[db.currentUserId || 'user-self'];
    return currentUser?.name || '';
  });
  const [city, setCity] = useState('');
  const [cityCoords, setCityCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [mode, setMode] = useState('both'); // lend, borrow, both

  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCitySuggestions, setFilteredCitySuggestions] = useState([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  React.useEffect(() => {
    if (!city.trim()) {
      setFilteredCitySuggestions(FALLBACK_CITIES.slice(0, 5));
      return;
    }

    const exactMatch = FALLBACK_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
    if (exactMatch) {
      setCityCoords({ lat: exactMatch.lat, lng: exactMatch.lng });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingCities(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(city)}`
        );
        const data = await response.json();
        
        let suggestions = [];
        if (data && Array.isArray(data) && data.length > 0) {
          suggestions = data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
        }

        // Try local matching fallback first
        const localMatches = FALLBACK_CITIES.filter(c =>
          c.name.toLowerCase().includes(city.toLowerCase())
        );

        // Deduplicate and merge suggestions
        const merged = [...suggestions];
        localMatches.forEach(match => {
          if (!merged.some(m => m.name.toLowerCase().includes(match.name.toLowerCase()) || match.name.toLowerCase().includes(m.name.toLowerCase()))) {
            merged.push(match);
          }
        });

        setFilteredCitySuggestions(merged.slice(0, 5));
      } catch (err) {
        console.error("Onboarding city geocoding error:", err);
        const filtered = FALLBACK_CITIES.filter(c =>
          c.name.toLowerCase().includes(city.toLowerCase())
        );
        setFilteredCitySuggestions(filtered.slice(0, 5));
      } finally {
        setIsLoadingCities(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [city]);

  const handleCityChange = (val) => {
    setCity(val);
    setShowCitySuggestions(true);
  };

  const handleCityFocus = () => {
    if (!city.trim()) {
      setFilteredCitySuggestions(FALLBACK_CITIES.slice(0, 5));
    }
    setShowCitySuggestions(true);
  };

  const handleCityBlur = () => {
    setTimeout(() => {
      setShowCitySuggestions(false);
    }, 200);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        alert('Please tell us your name first so we can greet you properly!');
        return;
      }
      if (!city.trim()) {
        alert('Please enter your city and state so neighbors can find you!');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleFinish = () => {
    let finalLat = cityCoords.lat;
    let finalLng = cityCoords.lng;
    
    // If geocoding failed/rate-limited and coordinates are standard Bangalore but city is non-Bangalore, fallback to local coordinates
    if (finalLat === 12.9716 && finalLng === 77.5946 && city.toLowerCase() !== 'bangalore' && city.toLowerCase() !== 'bengaluru') {
      const localCoords = getCoordinatesForAddress('', city);
      if (localCoords.lat !== 12.9716 || localCoords.lng !== 77.5946) {
        finalLat = localCoords.lat;
        finalLng = localCoords.lng;
      }
    } else if (filteredCitySuggestions.length > 0 && (finalLat === 12.9716 && finalLng === 77.5946 && city.toLowerCase() !== 'bangalore')) {
      finalLat = filteredCitySuggestions[0].lat;
      finalLng = filteredCitySuggestions[0].lng;
    }

    const updatedUser = dbOps.completeOnboarding({
      name,
      city,
      avatar,
      onboardingUseMode: mode,
      lat: finalLat,
      lng: finalLng
    });
    onComplete(updatedUser);
  };

  return (
    <div className="modal-overlay" style={{ background: 'var(--overlay-bg)', zIndex: 9999 }}>
      <div className="modal-content" style={{ padding: '40px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* Step Progress indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: '40px',
                height: '6px',
                borderRadius: '99px',
                backgroundColor: s <= step ? 'var(--accent-color)' : 'var(--border-color)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>

        {/* STEP 1: Tell us about yourself */}
        {step === 1 && (
          <div style={{ animation: 'slide-in 0.3s' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-color-light)', color: 'var(--accent-color)', marginBottom: '16px' }}>
                <Sparkles size={32} />
              </div>
              <h2>Welcome to RentIt!</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                Let's set up your profile. It takes less than a minute!
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ob-name">What is your name?</label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  id="ob-name"
                  className="form-control"
                  style={{ paddingLeft: '48px' }}
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" htmlFor="ob-city">Where do you live? (City, State)</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)', zIndex: 2 }} />
                <input
                  type="text"
                  id="ob-city"
                  className="form-control"
                  style={{ paddingLeft: '48px', height: '48px' }}
                  placeholder="e.g. Bangalore, Karnataka or Mumbai, Maharashtra"
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  onFocus={handleCityFocus}
                  onBlur={handleCityBlur}
                  autoComplete="off"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showCitySuggestions && (filteredCitySuggestions.length > 0 || isLoadingCities) && (
                <ul 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 10,
                    margin: '4px 0 0 0',
                    padding: '6px 0',
                    listStyle: 'none',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}
                >
                  {isLoadingCities && (
                    <li style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span>🔍 Searching India cities...</span>
                    </li>
                  )}
                  {filteredCitySuggestions.map((c, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => {
                          setCity(c.name);
                          setCityCoords({ lat: c.lat, lng: c.lng });
                          setShowCitySuggestions(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          background: 'none',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'block',
                          transition: 'background-color 0.15s ease',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        🌆 <strong>{c.name.split(',')[0]}</strong> <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.name.split(',').slice(1).join(',')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Pick an avatar photo</label>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                {AVATAR_OPTIONS.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAvatar(url)}
                    style={{
                      border: avatar === url ? '4px solid var(--accent-color)' : '2px solid var(--border-color)',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      padding: 0,
                      width: '64px',
                      height: '64px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      transform: avatar === url ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <img src={url} alt={`Avatar option ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleNextStep}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px', height: '52px' }}
            >
              Continue <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* STEP 2: Lend or Borrow */}
        {step === 2 && (
          <div style={{ animation: 'slide-in 0.3s' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2>How would you like to use RentIt?</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                All tools remain accessible. This helps us customize your homepage dashboard!
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {/* Option Lend */}
              <button
                type="button"
                onClick={() => setMode('lend')}
                className="card"
                style={{
                  textAlign: 'left',
                  border: mode === 'lend' ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                  backgroundColor: mode === 'lend' ? 'var(--accent-color-light)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '32px' }}>🤝</div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>I want to lend my items</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Share my household tools, appliances, or cycles to earn extra pocket money.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option Borrow */}
              <button
                type="button"
                onClick={() => setMode('borrow')}
                className="card"
                style={{
                  textAlign: 'left',
                  border: mode === 'borrow' ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                  backgroundColor: mode === 'borrow' ? 'var(--accent-color-light)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '32px' }}>🛠️</div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>I want to borrow items</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Rent electronics, cameras, or garden tools nearby instead of buying expensive ones.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option Both */}
              <button
                type="button"
                onClick={() => setMode('both')}
                className="card"
                style={{
                  textAlign: 'left',
                  border: mode === 'both' ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                  backgroundColor: mode === 'both' ? 'var(--accent-color-light)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '32px' }}>✨</div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>I want to do both!</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      I want to list some spare equipment AND rent things from my neighbors.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button
                onClick={() => setStep(1)}
                className="btn btn-outline"
                style={{ flex: 1, height: '52px' }}
              >
                Go Back
              </button>
              <button
                onClick={handleNextStep}
                className="btn btn-primary"
                style={{ flex: 2, height: '52px' }}
              >
                Next <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete Guide and Go */}
        {step === 3 && (
          <div style={{ animation: 'slide-in 0.3s', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--status-success-light)', color: 'var(--status-success)', marginBottom: '16px' }}>
              <CheckCircle size={36} />
            </div>
            <h2>You're all set, {name}!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '28px' }}>
              Here's a brief tour of what you can do on RentIt:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left', marginBottom: '32px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', fontWeight: '600', marginBottom: '6px' }}>
                  <Search size={18} /> Browse Items
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Find everyday gear on a friendly map within a few kilometers!</span>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', fontWeight: '600', marginBottom: '6px' }}>
                  <Box size={18} /> My Items
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>List your items for free in a simple form and start earning.</span>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', fontWeight: '600', marginBottom: '6px' }}>
                  <MessageSquare size={18} /> Requests
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Accept or cancel listings and coordinate easy face-to-face meetups.</span>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', fontWeight: '600', marginBottom: '6px' }}>
                  <History size={18} /> History Logs
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Keep records of your past reviews, receipts, and export them.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(2)}
                className="btn btn-outline"
                style={{ flex: 1, height: '52px' }}
              >
                Go Back
              </button>
              <button
                onClick={handleFinish}
                className="btn btn-primary"
                style={{ flex: 2, height: '52px' }}
              >
                Start Exploring RentIt!
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
