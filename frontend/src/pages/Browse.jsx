import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, MapPin, Grid, List, Search, RefreshCw, X, Navigation } from 'lucide-react';
import LeafletMap from '../components/LeafletMap.jsx';
import ItemCard from '../components/ItemCard.jsx';
import { useAuth } from '../context/useAuth.js';
import { itemsApi } from '../api/items.js';
import { geocodeApi } from '../api/geocode.js';

const CATEGORIES = [
  'All Categories',
  'Power Tools',
  'Photography',
  'Electronics',
  'Outdoors',
  'Home & Garden',
  'Sports & Fitness',
  'Kitchen & Appliances',
  'General'
];

export default function Browse({ onViewItem, onViewUser, toast }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Coordinates state - default to authenticated user's location if available, otherwise null (NO fake Bangalore coordinates)
  const [userLat, setUserLat] = useState(typeof user?.latitude === 'number' ? user.latitude : null);
  const [userLng, setUserLng] = useState(typeof user?.longitude === 'number' ? user.longitude : null);
  const [locationLabel, setLocationLabel] = useState(user?.city || (user?.latitude ? 'Saved Location' : 'All Locations'));

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceMax, setPriceMax] = useState(5000);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [distanceRadius, setDistanceRadius] = useState(25); // km
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price-low', 'price-high'

  // Items from backend
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Location search suggestions
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [activeLocIndex, setActiveLocIndex] = useState(-1);
  const [isLocating, setIsLocating] = useState(false);

  // Items view mode
  const [viewType, setViewType] = useState('grid');
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);

  // Fetch items from backend API with AbortSignal support to avoid race conditions
  const fetchItems = useCallback(async (signal) => {
    setIsLoading(true);
    setError(null);
    try {
      const hasCoords = typeof userLat === 'number' && typeof userLng === 'number' && !isNaN(userLat) && !isNaN(userLng);
      const isAnywhere = distanceRadius === 'anywhere' || distanceRadius === null || distanceRadius === 0;
      const filters = {
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        maxPrice: priceMax,
        availableOnly: showOnlyAvailable ? 'true' : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        lat: hasCoords ? userLat : undefined,
        lng: hasCoords ? userLng : undefined,
        radius: (hasCoords && !isAnywhere) ? distanceRadius : undefined
      };

      const data = await itemsApi.getItems(filters, signal);
      const itemsList = Array.isArray(data) ? data : (data?.items || []);

      // Client sort for secondary ordering
      let sorted = [...itemsList];
      if (sortBy === 'price-low') {
        sorted.sort((a, b) => a.dailyPrice - b.dailyPrice);
      } else if (sortBy === 'price-high') {
        sorted.sort((a, b) => b.dailyPrice - a.dailyPrice);
      } else {
        // newest
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      setItems(sorted);
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        return; // Request was aborted due to newer query; ignore silently
      }
      setError(err.message || 'Failed to fetch items');
      if (toast) toast(`Error loading items: ${err.message}`);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedCategory, searchQuery, priceMax, showOnlyAvailable, minRating, userLat, userLng, distanceRadius, sortBy, toast]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchItems(controller.signal);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchItems]);

  // Debounced geocoder for location search
  useEffect(() => {
    if (!locationQuery.trim() || locationQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeApi.search(locationQuery, controller.signal);
        setLocationSuggestions(results || []);
      } catch (err) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          // ignore geocode error
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery]);

  // Handle explicit selection of a location suggestion
  const handleSelectLocation = (s) => {
    setUserLat(s.latitude);
    setUserLng(s.longitude);
    setLocationLabel(s.city || s.label);
    setLocationQuery('');
    setShowLocSuggestions(false);
    setActiveLocIndex(-1);
    if (toast) toast(`Location updated to ${s.city || s.label} 📍`);
  };

  const handleLocationKeyDown = (e) => {
    if (!showLocSuggestions || locationSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && locationSuggestions.length > 0) {
        setShowLocSuggestions(true);
        setActiveLocIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveLocIndex((prev) => (prev < locationSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveLocIndex((prev) => (prev > 0 ? prev - 1 : locationSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeLocIndex >= 0 && locationSuggestions[activeLocIndex]) {
        e.preventDefault();
        handleSelectLocation(locationSuggestions[activeLocIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowLocSuggestions(false);
      setActiveLocIndex(-1);
    }
  };

  const handleClearLocation = () => {
    setUserLat(null);
    setUserLng(null);
    setLocationLabel('All Locations');
    setLocationQuery('');
    if (toast) toast('Location filter cleared (showing all listings)');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      if (toast) toast('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);

        try {
          const rev = await geocodeApi.reverse(lat, lng);
          const label = rev?.city || rev?.label || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
          setLocationLabel(label);
          if (toast) toast(`Location set to ${label} 📍`);
        } catch {
          setLocationLabel(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);
          if (toast) toast('Location updated from device GPS 📍');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        const msg = err.code === 1 ? 'Permission denied.' : err.code === 2 ? 'Location unavailable.' : 'Location request timed out.';
        if (toast) toast(`Could not retrieve your location: ${msg}`);
      },
      { timeout: 8000 }
    );
  };

  const handleItemClick = (id) => {
    if (onViewItem) onViewItem(id);
    else navigate(`/items/${id}`);
  };

  const handleUserClick = (id) => {
    if (onViewUser) onViewUser(id);
    else navigate(`/profile/${id}`);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setPriceMax(5000);
    setShowOnlyAvailable(false);
    setMinRating(0);
    setDistanceRadius(25);
    setSortBy('newest');
  };

  return (
    <div className="main-content">
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Title Header Toolbar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
              Browse Neighborhood Items
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>
              Near <strong>{locationLabel}</strong> • {items.length} {items.length === 1 ? 'item' : 'items'} found
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={fetchItems}
              disabled={isLoading}
              className="btn btn-secondary"
              aria-label="Refresh items"
            >
              <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Search & Location Bar */}
        <div className="browse-search-grid" style={{ marginBottom: '24px' }}>
          {/* Item Search Input */}
          <div style={{ position: 'relative' }}>
            <Search
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
              type="text"
              className="form-control"
              style={{ paddingLeft: '44px', height: '46px' }}
              placeholder="Search items, tools, cameras, camping gear..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn-icon"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  minWidth: '32px',
                  minHeight: '32px',
                  padding: '4px'
                }}
                aria-label="Clear search query"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Location Search Input */}
          <div style={{ position: 'relative' }}>
            <MapPin
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--accent-color)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={showLocSuggestions && locationSuggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="browse-location-suggestions"
              aria-activedescendant={activeLocIndex >= 0 ? `browse-loc-opt-${activeLocIndex}` : undefined}
              className="form-control"
              style={{ paddingLeft: '44px', paddingRight: userLat !== null ? '64px' : '40px', height: '46px' }}
              placeholder={`Search location (current: ${locationLabel})`}
              value={locationQuery}
              onChange={(e) => {
                setLocationQuery(e.target.value);
                if (e.target.value.trim().length < 2) {
                  setLocationSuggestions([]);
                }
                setShowLocSuggestions(true);
                setActiveLocIndex(-1);
              }}
              onKeyDown={handleLocationKeyDown}
              onFocus={() => setShowLocSuggestions(true)}
            />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {userLat !== null && (
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="btn-icon"
                  style={{ minWidth: '32px', minHeight: '32px', padding: '4px' }}
                  aria-label="Clear location filter"
                  title="Clear location filter"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="btn-icon"
                style={{ minWidth: '32px', minHeight: '32px', padding: '4px', color: 'var(--accent-color)' }}
                aria-label="Use current GPS location"
                title="Use current GPS location"
              >
                <Navigation size={18} />
              </button>
            </div>

            {/* Suggestions dropdown */}
            {showLocSuggestions && locationSuggestions.length > 0 && (
              <ul
                id="browse-location-suggestions"
                role="listbox"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 100,
                  listStyle: 'none',
                  padding: '6px 0',
                  margin: '4px 0 0 0'
                }}
              >
                {locationSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    id={`browse-loc-opt-${idx}`}
                    role="option"
                    aria-selected={idx === activeLocIndex}
                    onMouseDown={() => handleSelectLocation(s)}
                    style={{
                      padding: '10px 14px',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                      backgroundColor: idx === activeLocIndex ? 'var(--bg-hover, rgba(0,0,0,0.06))' : 'transparent',
                      borderBottom: idx < locationSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <strong>{s.city || 'Neighborhood'}</strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{s.label}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      {/* Main Content: Filters + Map & Grid */}
      <div className="browse-layout-grid">
        {/* Desktop Sidebar Filters */}
        <aside
          className="card"
          style={{
            padding: '20px',
            height: 'fit-content',
            position: 'sticky',
            top: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SlidersHorizontal size={18} /> Filters
            </h2>
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn-ghost"
              style={{
                color: 'var(--accent-color)',
                fontSize: 'var(--text-xs)',
                fontWeight: '600'
              }}
            >
              Reset
            </button>
          </div>

          {/* Category */}
          <div className="filter-section">
            <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginBottom: '8px' }}>
              Category
            </label>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Toggle */}
          <div className="filter-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <label
                htmlFor="filter-show-available"
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'block'
                }}
              >
                Available Only
              </label>
              <p
                id="filter-show-available-desc"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.4' }}
              >
                Hide items currently rented out
              </p>
            </div>
            <label className="switch" style={{ flexShrink: 0 }}>
              <input
                id="filter-show-available"
                type="checkbox"
                role="switch"
                aria-checked={showOnlyAvailable}
                aria-describedby="filter-show-available-desc"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>

          {/* Search Radius - Consolidated single slider with preset step markers & Anywhere toggle */}
          <div className="filter-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label htmlFor="filter-distance-radius" style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Search Radius
              </label>
              <button
                type="button"
                onClick={() => setDistanceRadius((prev) => (prev === 'anywhere' ? 25 : 'anywhere'))}
                className="btn-pill"
                aria-pressed={distanceRadius === 'anywhere'}
                style={{
                  minHeight: '26px',
                  padding: '2px 8px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '600',
                  backgroundColor: distanceRadius === 'anywhere' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                  color: distanceRadius === 'anywhere' ? '#2563EB' : 'var(--text-secondary)',
                  borderColor: distanceRadius === 'anywhere' ? '#2563EB' : 'var(--border-color)'
                }}
              >
                Anywhere 🌍
              </button>
            </div>

            {/* Single Consolidated Slider with marked step presets */}
            <input
              id="filter-distance-radius"
              type="range"
              min="5"
              max="50"
              step="5"
              list="radius-preset-markers"
              value={distanceRadius === 'anywhere' ? 50 : distanceRadius}
              onChange={(e) => setDistanceRadius(Number(e.target.value))}
              disabled={distanceRadius === 'anywhere'}
              style={{
                width: '100%',
                accentColor: distanceRadius === 'anywhere' ? 'var(--text-muted)' : 'var(--accent-color)',
                opacity: distanceRadius === 'anywhere' ? 0.6 : 1
              }}
              aria-label={`Search radius: ${distanceRadius === 'anywhere' ? 'Anywhere' : `${distanceRadius} km`}`}
            />
            <datalist id="radius-preset-markers">
              <option value="5" label="5 km" />
              <option value="10" label="10 km" />
              <option value="25" label="25 km" />
              <option value="50" label="50 km" />
            </datalist>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>5 km</span>
              <span style={{ fontWeight: '600', color: distanceRadius === 'anywhere' ? '#2563EB' : 'var(--accent-color)' }}>
                {distanceRadius === 'anywhere' ? 'Anywhere' : `${distanceRadius} km`}
              </span>
              <span>50 km</span>
            </div>

            {distanceRadius === 'anywhere' ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: '1.3' }}>
                🌍 Searching all listings without any distance limitation.
              </p>
            ) : !(typeof userLat === 'number' && typeof userLng === 'number') ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--status-warning)', margin: '4px 0 0 0' }}>
                📍 Set a location above to filter listings within {distanceRadius} km, or choose <strong>Anywhere</strong>.
              </p>
            ) : null}
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label htmlFor="filter-price-max" style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Max Daily Rent
              </label>
              <span style={{ backgroundColor: 'var(--accent-color-light)', color: 'var(--accent-color)', fontWeight: '700', fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                ₹{priceMax}/day
              </span>
            </div>
            <input
              id="filter-price-max"
              type="range"
              min="100"
              max="10000"
              step="100"
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-color)' }}
              aria-label={`Max daily rent: ₹${priceMax} per day`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>₹100</span>
              <span>₹10,000</span>
            </div>
          </div>

          {/* Minimum Lender Rating */}
          <div className="filter-section">
            <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginBottom: '8px' }}>
              Min Lender Rating
            </label>
            <select
              className="form-control"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
            >
              <option value="0">Any Rating (includes unrated)</option>
              <option value="4">4.0+ Stars ★★★★</option>
              <option value="4.5">4.5+ Stars ★★★★★</option>
            </select>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
              Filters by lender rating. Unrated lenders are included under &ldquo;Any Rating&rdquo;.
            </p>
          </div>

          {/* Sorting */}
          <div className="filter-section">
            <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginBottom: '8px' }}>
              Sort By
            </label>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Recently Listed</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </aside>

        {/* Right Section: Map & Listings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Interactive Map (Compact & Collapsible) */}
          {!isMapCollapsed && (
            <div
              className="card"
              style={{
                height: '160px',
                padding: 0,
                overflow: 'hidden',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <LeafletMap
                items={items}
                userLat={userLat}
                userLng={userLng}
                radiusKm={distanceRadius === 'anywhere' ? null : distanceRadius}
                onLocationChange={(lat, lng) => {
                  setUserLat(lat);
                  setUserLng(lng);
                  setLocationLabel('Pinned Map Location');
                }}
                onViewItem={handleItemClick}
              />
            </div>
          )}

          {/* Anchored Results & Map Controls Toolbar */}
          <div className="browse-toolbar">
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{items.length}</strong> {items.length === 1 ? 'item' : 'items'}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsMapCollapsed((prev) => !prev)}
                className="btn-ghost"
                style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}
                aria-expanded={!isMapCollapsed}
                aria-label={isMapCollapsed ? 'Show map' : 'Hide map'}
              >
                <MapPin size={14} />
                <span>{isMapCollapsed ? 'Show Map' : 'Hide Map'}</span>
              </button>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px'
                }}
                role="group"
                aria-label="View layout switch"
              >
                <button
                  type="button"
                  onClick={() => setViewType('grid')}
                  className={viewType === 'grid' ? 'btn btn-primary' : 'btn-ghost'}
                  style={{
                    minHeight: '30px',
                    minWidth: '30px',
                    padding: '4px',
                    borderRadius: 'var(--radius-full)'
                  }}
                  aria-label="Grid view"
                  aria-pressed={viewType === 'grid'}
                >
                  <Grid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('list')}
                  className={viewType === 'list' ? 'btn btn-primary' : 'btn-ghost'}
                  style={{
                    minHeight: '30px',
                    minWidth: '30px',
                    padding: '4px',
                    borderRadius: 'var(--radius-full)'
                  }}
                  aria-label="List view"
                  aria-pressed={viewType === 'list'}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Items Grid / Empty State */}
          {isLoading ? (
            <div style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Loading neighborhood items...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: 'var(--status-danger)' }}>{error}</p>
              <button type="button" onClick={fetchItems} className="btn btn-primary">
                Try Again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="card" style={{ width: '100%', boxSizing: 'border-box', padding: '48px', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', marginBottom: '8px' }}>
                No items match your search
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                Try widening your search radius, selecting a different category, or resetting active filters.
              </p>
              <button type="button" onClick={clearAllFilters} className="btn btn-primary">
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  viewType === 'grid' ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr',
                gap: '20px'
              }}
            >
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onView={handleItemClick}
                  onViewUser={handleUserClick}
                  isOwner={user && user.id === item.lenderId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
