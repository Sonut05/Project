import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, User, MapPin, CheckCircle, Navigation } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { usersApi } from '../api/users.js';
import { geocodeApi } from '../api/geocode.js';
import { AVATAR_PLACEHOLDER } from '../utils/imageUrl.js';

const AVATAR_OPTIONS = [
  AVATAR_PLACEHOLDER
];

export default function Onboarding({ onComplete }) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [coords, setCoords] = useState({
    lat: user?.latitude ?? null,
    lng: user?.longitude ?? null
  });
  const [avatar, setAvatar] = useState(user?.avatarUrl || AVATAR_OPTIONS[0]);
  const [mode, setMode] = useState(user?.onboardingUseMode || 'both'); // 'borrow', 'lend', 'both'

  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Debounced geocoding search for city
  useEffect(() => {
    if (!city.trim() || city.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeApi.search(city, controller.signal);
        setCitySuggestions(results || []);
        setActiveCityIndex(-1);
      } catch {
        // Ignored
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [city]);

  const handleSelectCitySuggestion = (s) => {
    setCity(s.city || s.label);
    setCoords({ lat: s.latitude, lng: s.longitude });
    setShowCitySuggestions(false);
    setActiveCityIndex(-1);
    setErrorMsg('');
  };

  const handleCityKeyDown = (e) => {
    if (!showCitySuggestions || citySuggestions.length === 0) {
      if (e.key === 'ArrowDown' && citySuggestions.length > 0) {
        setShowCitySuggestions(true);
        setActiveCityIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveCityIndex((prev) => (prev < citySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCityIndex((prev) => (prev > 0 ? prev - 1 : citySuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeCityIndex >= 0 && citySuggestions[activeCityIndex]) {
        e.preventDefault();
        handleSelectCitySuggestion(citySuggestions[activeCityIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowCitySuggestions(false);
      setActiveCityIndex(-1);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
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
          } else {
            setErrorMsg('Location detected, but we could not determine your neighborhood name. Please select one manually.');
          }
        } catch {
          setErrorMsg('Location detected, but we could not determine your neighborhood name. Please select one manually.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        const msg = err.code === 1 ? 'Permission denied.' : err.code === 2 ? 'Location unavailable.' : 'Location request timed out.';
        setErrorMsg(`Location error: ${msg} Please type your city/area name and select a suggestion.`);
      },
      { timeout: 10000 }
    );
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      setStep(1);
      return;
    }

    if (!city.trim() || coords.lat === null || coords.lng === null) {
      setErrorMsg('Please select a valid neighborhood location with coordinates.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updateData = {
        name: name.trim(),
        city: city.trim(),
        avatarUrl: avatar,
        latitude: coords.lat,
        longitude: coords.lng,
        onboardingUseMode: mode
      };

      const res = await usersApi.updateMe(updateData);
      updateUser(res.user);

      // Verify that server has actually marked onboarding complete
      if (res.user?.onboardingCompletedAt) {
        if (onComplete) onComplete();
      } else {
        setErrorMsg('Profile saved, but onboarding is not yet marked complete by server.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete profile setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          padding: '32px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                backgroundColor: s <= step ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--status-danger-light)',
              color: 'var(--status-danger)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '16px'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Name and Avatar */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={20} color="var(--accent-color)" />
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Welcome to RentIt!</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Let’s set up your profile so neighbors can recognize you.
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="onboard-name">
                Your Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  id="onboard-name"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '44px', height: '46px' }}
                  placeholder="e.g. Alex Rivers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Profile Avatar</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {AVATAR_OPTIONS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(av)}
                    style={{
                      padding: 0,
                      border: avatar === av ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      width: '56px',
                      height: '56px'
                    }}
                  >
                    <img src={av} alt="Avatar option" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                if (!name.trim()) {
                  setErrorMsg('Please enter your name.');
                  return;
                }
                setErrorMsg('');
                setStep(2);
              }}
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MapPin size={20} color="var(--accent-color)" />
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Your Neighborhood</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              We use your neighborhood to show items and borrow requests near you.
            </p>

            <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }}>
              <label className="form-label" htmlFor="onboard-city">
                Neighborhood or City
              </label>
              <input
                id="onboard-city"
                type="text"
                role="combobox"
                aria-expanded={showCitySuggestions && citySuggestions.length > 0}
                aria-autocomplete="list"
                aria-controls="onboard-city-suggestions"
                aria-activedescendant={activeCityIndex >= 0 ? `onboard-city-opt-${activeCityIndex}` : undefined}
                className="form-control"
                style={{ height: '46px' }}
                placeholder="Search neighborhood (e.g. Indiranagar, Bengaluru)"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  // Invalidate coordinates on manual typing until selected from suggestions
                  setCoords({ lat: null, lng: null });
                  if (e.target.value.trim().length < 2) {
                    setCitySuggestions([]);
                  }
                  setShowCitySuggestions(true);
                  setActiveCityIndex(-1);
                }}
                onKeyDown={handleCityKeyDown}
                onFocus={() => setShowCitySuggestions(true)}
              />

              {coords.lat !== null && coords.lng !== null && (
                <span style={{ fontSize: '11px', color: 'var(--status-success)', marginTop: '4px', display: 'block' }}>
                  ✓ Coordinates set for your neighborhood
                </span>
              )}

              {showCitySuggestions && citySuggestions.length > 0 && (
                <ul
                  id="onboard-city-suggestions"
                  role="listbox"
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
                      id={`onboard-city-opt-${idx}`}
                      role="option"
                      aria-selected={idx === activeCityIndex}
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backgroundColor: idx === activeCityIndex ? 'var(--bg-hover, rgba(0,0,0,0.06))' : 'transparent',
                        color: 'var(--text-primary)'
                      }}
                      onMouseDown={() => handleSelectCitySuggestion(s)}
                    >
                      {s.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="btn btn-outline"
              style={{
                width: '100%',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                marginBottom: '24px'
              }}
            >
              <Navigation size={15} />
              {isLocating ? 'Detecting location...' : 'Use current location'}
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, height: '46px' }}
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => {
                  if (!city.trim() || coords.lat === null || coords.lng === null) {
                    setErrorMsg('Please select a valid neighborhood from the suggestions or detect your location.');
                    return;
                  }
                  setErrorMsg('');
                  setStep(3);
                }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Goal & Complete */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle size={20} color="var(--accent-color)" />
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>How do you plan to use RentIt?</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              You can do both anytime!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'borrow', title: 'I want to Borrow Items', desc: 'Find tools, gear, and appliances from neighbors' },
                { id: 'lend', title: 'I want to Lend Items', desc: 'Earn passive rental income from unused items' },
                { id: 'both', title: 'Both Borrowing and Lending', desc: 'Full experience to share and borrow freely' }
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: mode === opt.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    backgroundColor: mode === opt.id ? 'var(--accent-color-light)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <strong style={{ fontSize: '14px', display: 'block', color: 'var(--text-primary)' }}>
                    {opt.title}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{opt.desc}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, height: '46px' }}
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handleFinish}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Profile...' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
