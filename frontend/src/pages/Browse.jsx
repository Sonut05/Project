import React, { useState, useEffect } from 'react';
import { getDb, calculateDistance, getCoordinatesForAddress } from '../utils/mockDb';
import LeafletMap from '../components/LeafletMap';
import ItemCard from '../components/ItemCard';
import { SlidersHorizontal, MapPin, Grid, List, Search, RefreshCw, X, Filter } from 'lucide-react';

// Fallback Indian locations in case geocoding is offline or rate-limited
const FALLBACK_LOCATIONS = [
  { name: "HSR Layout, Bangalore, Karnataka", lat: 12.9100, lng: 77.6400 },
  { name: "Jayanagar, Bangalore, Karnataka", lat: 12.9300, lng: 77.5800 },
  { name: "Indiranagar, Bangalore, Karnataka", lat: 12.9780, lng: 77.6400 },
  { name: "Koramangala, Bangalore, Karnataka", lat: 12.9350, lng: 77.6250 },
  { name: "Whitefield, Bangalore, Karnataka", lat: 12.9698, lng: 77.7500 },
  { name: "Hebbal, Bangalore, Karnataka", lat: 13.0350, lng: 77.5970 },
  { name: "Mumbai, Maharashtra", lat: 19.0760, lng: 72.8777 },
  { name: "Delhi, NCR", lat: 28.6139, lng: 77.2090 },
  { name: "Noida, Uttar Pradesh", lat: 28.5355, lng: 77.3910 },
  { name: "Gurgaon, Haryana", lat: 28.4595, lng: 77.0266 },
  { name: "Hyderabad, Telangana", lat: 17.3850, lng: 78.4867 },
  { name: "Pune, Maharashtra", lat: 18.5204, lng: 73.8567 },
  { name: "Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata, West Bengal", lat: 22.5726, lng: 88.3639 },
  { name: "Goa", lat: 15.2993, lng: 74.1240 },
  { name: "Ahmedabad, Gujarat", lat: 23.0225, lng: 72.5714 },
  { name: "Vadodara, Gujarat", lat: 22.3072, lng: 73.1812 },
  { name: "Jaipur, Rajasthan", lat: 26.9124, lng: 75.7873 }
];

export default function Browse({ onViewItem, onViewUser, toast }) {
  const [db, setDb] = useState(getDb());
  
  const selfUser = db.users[db.currentUserId || 'user-self'];

  // User Location coordinates: Defaulting to user-self profile coords or standard Central Bangalore
  const [userLat, setUserLat] = useState(() => {
    let lat = selfUser?.lat || 12.9716;
    if (lat === 12.9716 && selfUser?.city && !selfUser.city.toLowerCase().includes('bangalore') && !selfUser.city.toLowerCase().includes('bengaluru')) {
      const coords = getCoordinatesForAddress('', selfUser.city);
      if (coords.lat !== 12.9716) lat = coords.lat;
    }
    return lat;
  });
  const [userLng, setUserLng] = useState(() => {
    let lng = selfUser?.lng || 77.5946;
    if (lng === 77.5946 && selfUser?.city && !selfUser.city.toLowerCase().includes('bangalore') && !selfUser.city.toLowerCase().includes('bengaluru')) {
      const coords = getCoordinatesForAddress('', selfUser.city);
      if (coords.lng !== 77.5946) lng = coords.lng;
    }
    return lng;
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState(selfUser?.city || 'Bangalore Central');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMax, setPriceMax] = useState(2000);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [distanceRadius, setDistanceRadius] = useState(100); // default 100 km (Anywhere)
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [sortBy, setSortBy] = useState('nearest');

  // UI state
  const [isFilterOpenMobile, setIsFilterOpenMobile] = useState(false);
  const [viewType, setViewType] = useState('grid'); // grid or list
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState(FALLBACK_LOCATIONS.slice(0, 5));
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    if (!locationSearchQuery.trim()) {
      setLocationSuggestions(FALLBACK_LOCATIONS.slice(0, 5));
      return;
    }

    // Auto-snap coordinates as the user types a known offline city keyword (like Vadodara) to prevent geofencing them out
    const queryLower = locationSearchQuery.toLowerCase();
    if (queryLower.includes('vadodara') || queryLower.includes('baroda')) {
      setUserLat(22.3072);
      setUserLng(73.1812);
    } else if (queryLower.includes('ahmedabad')) {
      setUserLat(23.0225);
      setUserLng(72.5714);
    } else if (queryLower.includes('mumbai') || queryLower.includes('bombay')) {
      setUserLat(19.0760);
      setUserLng(72.8777);
    } else if (queryLower.includes('delhi') || queryLower.includes('ncr')) {
      setUserLat(28.6139);
      setUserLng(77.2090);
    } else if (queryLower.includes('bangalore') || queryLower.includes('bengaluru')) {
      setUserLat(12.9716);
      setUserLng(77.5946);
    } else if (queryLower.includes('pune')) {
      setUserLat(18.5204);
      setUserLng(73.8567);
    } else if (queryLower.includes('chennai') || queryLower.includes('madras')) {
      setUserLat(13.0827);
      setUserLng(80.2707);
    } else if (queryLower.includes('hyderabad')) {
      setUserLat(17.3850);
      setUserLng(78.4867);
    } else if (queryLower.includes('kolkata') || queryLower.includes('calcutta')) {
      setUserLat(22.5726);
      setUserLng(88.3639);
    } else if (queryLower.includes('jaipur')) {
      setUserLat(26.9124);
      setUserLng(75.7873);
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingLocations(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(locationSearchQuery)}`
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

        // If Nominatim rate-limits or has no suggestions, or to guarantee local fallback cities show up
        const localMatches = FALLBACK_LOCATIONS.filter(loc =>
          loc.name.toLowerCase().includes(queryLower)
        );

        // Deduplicate and merge suggestions
        const merged = [...suggestions];
        localMatches.forEach(match => {
          if (!merged.some(m => m.name.toLowerCase().includes(match.name.toLowerCase()) || match.name.toLowerCase().includes(m.name.toLowerCase()))) {
            merged.push(match);
          }
        });

        setLocationSuggestions(merged.slice(0, 5));
      } catch (error) {
        console.error("Geocoding error:", error);
        const filtered = FALLBACK_LOCATIONS.filter(loc =>
          loc.name.toLowerCase().includes(queryLower)
        );
        setLocationSuggestions(filtered.slice(0, 5));
      } finally {
        setIsLoadingLocations(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [locationSearchQuery]);

  useEffect(() => {
    const handleUpdate = () => {
      const freshDb = getDb();
      setDb(freshDb);
      const self = freshDb.users[freshDb.currentUserId || 'user-self'];
      if (self) {
        let lat = self.lat || 12.9716;
        let lng = self.lng || 77.5946;
        if (lat === 12.9716 && lng === 77.5946 && self.city && !self.city.toLowerCase().includes('bangalore') && !self.city.toLowerCase().includes('bengaluru')) {
          const coords = getCoordinatesForAddress('', self.city);
          if (coords.lat !== 12.9716 || coords.lng !== 77.5946) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }
        setUserLat(lat);
        setUserLng(lng);
        setLocationSearchQuery(self.city || 'Bangalore Central');
      }
    };
    window.addEventListener('rentit_db_update', handleUpdate);
    return () => window.removeEventListener('rentit_db_update', handleUpdate);
  }, []);

  const categoriesList = [
    'Electronics', 'Tools & Hardware', 'Sports & Fitness', 'Furniture & Home', 
    'Kitchen & Appliances', 'Vehicles', 'Books & Education', 'Other'
  ];

  // Geolocation detector on load
  const handleAutoDetectLocation = () => {
    const self = db.users[db.currentUserId || 'user-self'];
    if (self && self.hasCompletedOnboarding && self.city) {
      let lat = self.lat || 12.9716;
      let lng = self.lng || 77.5946;
      if (lat === 12.9716 && lng === 77.5946 && !self.city.toLowerCase().includes('bangalore') && !self.city.toLowerCase().includes('bengaluru')) {
        const coords = getCoordinatesForAddress('', self.city);
        if (coords.lat !== 12.9716 || coords.lng !== 77.5946) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
      setUserLat(lat);
      setUserLng(lng);
      setLocationSearchQuery(self.city || 'Bangalore Central');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          toast('Location successfully synchronized! 📍');
        },
        () => {
          // Default coordinate values are already set
        }
      );
    }
  };

  useEffect(() => {
    handleAutoDetectLocation();
  }, []);

  // Category selection toggle
  const handleToggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Condition selection toggle
  const handleToggleCondition = (cond) => {
    if (selectedConditions.includes(cond)) {
      setSelectedConditions(selectedConditions.filter(c => c !== cond));
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  };

  // Count active filters to show count badge ("Filters · 3")
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategories.length > 0) count += 1;
    if (priceMax < 2000) count += 1;
    if (showOnlyAvailable) count += 1;
    if (minRating > 0) count += 1;
    if (distanceRadius !== 100) count += 1;
    if (selectedConditions.length > 0) count += 1;
    return count;
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setPriceMax(2000);
    setShowOnlyAvailable(false);
    setMinRating(0);
    setDistanceRadius(100);
    setSelectedConditions([]);
    setSearchQuery('');
    setSortBy('nearest');
    toast('All filters cleared instantly! 🧹');
  };

  // Perform filtration logic
  const getFilteredItems = () => {
    return db.items
      .map(item => {
        // Calculate dynamic haversine distance
        const distance = calculateDistance(userLat, userLng, item.lat, item.lng);
        // Calculate dynamic rating
        const rating = item.reviews.length > 0
          ? (item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length)
          : 5.0; // Assume 5.0 default rating for new item listings

        return { ...item, distance, rating };
      })
      .filter(item => {
        // 1. Search Query (Matches name, description, category)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(query);
          const matchDesc = item.description.toLowerCase().includes(query);
          const matchCat = item.category.toLowerCase().includes(query);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        // 2. Category multi-select
        if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
          return false;
        }

        // 3. Price slider (2000 is treated as ₹2000+ Unlimited)
        if (priceMax < 2000 && item.dailyPrice > priceMax) {
          return false;
        }

        // 4. Availability
        if (item.availability !== 'Available') {
          return false;
        }

        // 5. Rating selector
        if (minRating > 0 && item.rating < minRating) {
          return false;
        }

        // 6. Distance Slider geofence (100 is treated as Anywhere)
        if (distanceRadius < 100 && item.distance > distanceRadius) {
          return false;
        }

        // 7. Condition selection
        if (selectedConditions.length > 0 && !selectedConditions.includes(item.condition)) {
          return false;
        }

        // Exclude own items from browse exploration to keep P2P focus pure
        if (item.lenderId === (db.currentUserId || 'user-self')) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // 8. Dynamic Sorting selections
        if (sortBy === 'nearest') return a.distance - b.distance;
        if (sortBy === 'price-low') return a.dailyPrice - b.dailyPrice;
        if (sortBy === 'price-high') return b.dailyPrice - a.dailyPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        // Seeded IDs are chronologically generated via date timestamps
        if (sortBy === 'newest') return b.id.localeCompare(a.id);
        return 0;
      });
  };

  const filteredItems = getFilteredItems();

  // Geocode location search and glide the map to it smoothly
  const handleLocationSelect = (loc) => {
    setLocationSearchQuery(loc.name);
    setShowLocationSuggestions(false);
    setUserLat(loc.lat);
    setUserLng(loc.lng);
    toast(`Searching items in ${loc.name.split(',')[0]}! 📍`);
  };

  // Autocomplete Suggestions for Search Bar
  const autocompleteSuggestions = searchQuery.trim() 
    ? categoriesList
        .concat(['drill', 'camera', 'cycle', 'mixer', 'tent', 'mower', 'projector', 'table'])
        .filter(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
    : [];

  return (
    <div className="main-content browse-page">
      
      {/* 1. Integrated Header Search Bar */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          marginBottom: '24px',
          position: 'relative'
        }}
      >
        {/* Dual Input Search Bar (Products + Location) */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          width: '100%',
          flexWrap: 'wrap'
        }}>
          {/* A. Product Search */}
          <div style={{ position: 'relative', flex: '2 1 300px' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              className="form-control"
              style={{ paddingLeft: '48px', height: '48px', borderRadius: 'var(--radius-full)' }}
              placeholder="Search for a drill, camera, cycle, mixer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {/* Realtime Autocomplete dropdown */}
            {showSuggestions && autocompleteSuggestions.length > 0 && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '54px', 
                  left: '12px', 
                  right: '12px', 
                  backgroundColor: 'white', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}
              >
                {autocompleteSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(s);
                      setShowSuggestions(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      borderBottom: idx === autocompleteSuggestions.length - 1 ? 'none' : '1px solid var(--border-color)',
                    }}
                    onMouseDown={() => setSearchQuery(s)}
                  >
                    🔍 Suggest category: <strong style={{ color: 'var(--accent-color)' }}>{s}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* B. Location Search */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <MapPin size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--accent-color)' }} />
            <input 
              type="text"
              className="form-control"
              style={{ paddingLeft: '44px', height: '48px', borderRadius: 'var(--radius-full)', border: '2px solid var(--accent-color-light)' }}
              placeholder="Location (e.g. HSR, Mumbai)"
              value={locationSearchQuery}
              onChange={(e) => {
                setLocationSearchQuery(e.target.value);
                setShowLocationSuggestions(true);
              }}
              onFocus={() => setShowLocationSuggestions(true)}
              onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
            />
            {/* Realtime Location Autocomplete dropdown */}
            {showLocationSuggestions && (locationSuggestions.length > 0 || isLoadingLocations) && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '54px', 
                  left: '12px', 
                  right: '12px', 
                  backgroundColor: 'white', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}
              >
                {isLoadingLocations && (
                  <div style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span>Searching India locations...</span>
                  </div>
                )}
                {locationSuggestions.map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLocationSelect(loc)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      borderBottom: idx === locationSuggestions.length - 1 ? 'none' : '1px solid var(--border-color)',
                    }}
                    onMouseDown={() => handleLocationSelect(loc)}
                  >
                    📍 <strong>{loc.name.split(',')[0]}</strong> <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{loc.name.split(',').slice(1).join(',')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Filter Drawer trigger */}
          <button
            onClick={() => setIsFilterOpenMobile(true)}
            className="btn btn-outline"
            style={{ 
              borderRadius: 'var(--radius-full)', 
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            ref={(el) => {
              if (el) {
                el.style.setProperty('display', window.innerWidth < 1024 ? 'flex' : 'none');
              }
            }}
          >
            <SlidersHorizontal size={18} />
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <span style={{ backgroundColor: 'var(--accent-color)', color: 'white', fontSize: '11px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getActiveFilterCount()}
              </span>
            )}
          </button>
        </div>

        {/* Categories Horizontal Chips Row */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }} className="no-print">
          {categoriesList.map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleToggleCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '2px solid',
                  borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                  backgroundColor: isSelected ? 'var(--accent-color-light)' : 'var(--bg-secondary)',
                  color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: '34px',
                  minWidth: 'auto'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main split area: Sidebar filters + Map/Grid Content */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: '32px',
          alignItems: 'start'
        }}
        ref={(el) => {
          if (el) {
            el.style.setProperty('grid-template-columns', window.innerWidth >= 1024 ? '280px 1fr' : '1fr');
          }
        }}
      >
        
        {/* DESKTOP FILTER PANEL SIDEBAR */}
        <aside
          className="card no-print"
          style={{
            position: 'sticky',
            top: '40px',
            padding: '24px',
            display: 'none',
            flexDirection: 'column',
            gap: '20px',
            backgroundColor: 'var(--bg-secondary)'
          }}
          ref={(el) => {
            if (el) {
              el.style.setProperty('display', window.innerWidth >= 1024 ? 'flex' : 'none');
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} style={{ color: 'var(--accent-color)' }} /> Filters
            </h3>
            {getActiveFilterCount() > 0 && (
              <button 
                onClick={handleClearFilters}
                style={{ background: 'none', border: 'none', color: 'var(--status-danger)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Distance Geofence slider */}
          <div>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Search Radius</span>
              <strong style={{ color: 'var(--accent-color)' }}>{distanceRadius === 100 ? 'Anywhere 🌍' : `${distanceRadius} km`}</strong>
            </label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              step="1"
              style={{ width: '100%', accentColor: 'var(--accent-color)' }} 
              value={distanceRadius}
              onChange={(e) => setDistanceRadius(parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>1 km</span>
              <span>Anywhere</span>
            </div>
          </div>

          {/* Price range display slider */}
          <div>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Max Daily Price</span>
              <strong style={{ color: 'var(--accent-color)' }}>₹{priceMax}</strong>
            </label>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="50"
              style={{ width: '100%', accentColor: 'var(--accent-color)' }} 
              value={priceMax}
              onChange={(e) => setPriceMax(parseInt(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>₹100</span>
              <span>₹2000+</span>
            </div>
          </div>

          {/* Availability Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label" style={{ marginBottom: 0 }}>Show Only Available</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Condition multi check box */}
          <div>
            <label className="form-label">Item Condition</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['New', 'Good', 'Fair'].map(cond => (
                <label key={cond} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedConditions.includes(cond)}
                    onChange={() => handleToggleCondition(cond)}
                    style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px' }}
                  />
                  <span>{cond}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Lender Minimum Rating selection */}
          <div>
            <label className="form-label">Minimum Lender Rating</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setMinRating(rating)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: minRating === rating ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: minRating === rating ? 'var(--accent-color-light)' : 'transparent',
                    color: minRating === rating ? 'var(--accent-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    minWidth: 'auto'
                  }}
                >
                  {rating === 0 ? 'Any' : `${rating}★`}
                </button>
              ))}
            </div>
          </div>

        </aside>

        {/* MAP & CARDS CONTAINER AREA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Map layout (Radius bounded) */}
          <div style={{ height: '360px', width: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
            <LeafletMap 
              items={filteredItems}
              userLat={userLat}
              userLng={userLng}
              radiusKm={distanceRadius}
              onLocationChange={(lat, lng) => {
                setUserLat(lat);
                setUserLng(lng);
              }}
              onViewItem={onViewItem}
            />
          </div>

          {/* Card list layout toggle toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '18px' }}>{filteredItems.length} items found</strong>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block' }}>
                {distanceRadius === 100 ? 'Showing items from all distances.' : `Showing items within ${distanceRadius} km radius from your location pin.`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="no-print">
              
              {/* Sort By Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>SORT BY</span>
                <select 
                  className="form-control"
                  style={{ height: '38px', minWidth: '130px', padding: '0 12px', fontSize: '13px' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="nearest">Nearest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest Listed</option>
                </select>
              </div>

              {/* Grid / List Switcher */}
              <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setViewType('grid')}
                  style={{
                    backgroundColor: viewType === 'grid' ? 'var(--accent-color-light)' : 'white',
                    color: viewType === 'grid' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    minWidth: 'auto'
                  }}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('list')}
                  style={{
                    backgroundColor: viewType === 'list' ? 'var(--accent-color-light)' : 'white',
                    color: viewType === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    minWidth: 'auto'
                  }}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>

            </div>
          </div>

          {/* Filter results display */}
          {filteredItems.length === 0 ? (
            <div 
              style={{ 
                textAlign: 'center', 
                padding: '64px 24px', 
                backgroundColor: 'white', 
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>No nearby items found</h3>
              <div style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '480px', margin: '8px auto 24px', fontSize: '14px', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '12px' }}>
                  Try widening your search radius, selecting other categories, or clearing all filters to start fresh.
                </p>
                {locationSearchQuery.toLowerCase() !== 'bangalore' && !locationSearchQuery.toLowerCase().includes('hsr') && !locationSearchQuery.toLowerCase().includes('koramangala') && !locationSearchQuery.toLowerCase().includes('whitefield') && !locationSearchQuery.toLowerCase().includes('jayanagar') && (
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--accent-color-light)', border: '1px dashed var(--accent-color)', fontSize: '13px', color: 'var(--accent-color)', textAlign: 'left', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    <div>
                      <strong>Tip:</strong> All pre-configured sample items are listed around <strong>Bangalore</strong>. Search for <strong>"Bangalore"</strong> or <strong>"HSR Layout"</strong> in the location bar above to view the sample items instantly!
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleClearFilters} className="btn btn-primary">
                Clear Filters & Search
              </button>
            </div>
          ) : (
            <div 
              className={viewType === 'grid' ? 'grid-cols-responsive' : ''}
              style={viewType === 'list' ? { display: 'flex', flexDirection: 'column', gap: '16px' } : {}}
            >
              {filteredItems.map(item => (
                <div key={item.id} style={viewType === 'list' ? { width: '100%' } : {}}>
                  <ItemCard 
                    item={item} 
                    onView={onViewItem} 
                    onViewUser={onViewUser}
                  />
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* MOBILE DRAWER MODAL OVERLAY */}
      {isFilterOpenMobile && (
        <div className="modal-overlay no-print" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxHeight: '80vh', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', alignSelf: 'flex-end', margin: 0 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '18px' }}>Filters</h3>
              <button 
                onClick={() => setIsFilterOpenMobile(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              
              {/* Radius slider */}
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Search Radius</span>
                  <strong style={{ color: 'var(--accent-color)' }}>{distanceRadius === 100 ? 'Anywhere 🌍' : `${distanceRadius} km`}</strong>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  step="1"
                  style={{ width: '100%', accentColor: 'var(--accent-color)' }} 
                  value={distanceRadius}
                  onChange={(e) => setDistanceRadius(parseFloat(e.target.value))}
                />
              </div>

              {/* Price range dual slider */}
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max Daily Price</span>
                  <strong style={{ color: 'var(--accent-color)' }}>₹{priceMax}</strong>
                </label>
                <input 
                  type="range" 
                  min="100" 
                  max="2000" 
                  step="50"
                  style={{ width: '100%', accentColor: 'var(--accent-color)' }} 
                  value={priceMax}
                  onChange={(e) => setPriceMax(parseInt(e.target.value))}
                />
              </div>

              {/* Availability toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Show Only Available</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Condition */}
              <div>
                <label className="form-label">Item Condition</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {['New', 'Good', 'Fair'].map(cond => (
                    <label key={cond} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedConditions.includes(cond)}
                        onChange={() => handleToggleCondition(cond)}
                        style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px' }}
                      />
                      <span>{cond}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Minimum rating */}
              <div>
                <label className="form-label">Minimum Lender Rating</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setMinRating(rating)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: minRating === rating ? 'var(--accent-color)' : 'var(--border-color)',
                        backgroundColor: minRating === rating ? 'var(--accent-color-light)' : 'transparent',
                        color: minRating === rating ? 'var(--accent-color)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      {rating === 0 ? 'Any' : `${rating}★`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={handleClearFilters}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Clear All
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsFilterOpenMobile(false)}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  Apply Filters
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Resize Listener to automatically close mobile filter overlay if desktop screen size is matched */}
      <MobileFilterDrawerCleanup isOpen={isFilterOpenMobile} setIsOpen={setIsFilterOpenMobile} />

    </div>
  );
}

function MobileFilterDrawerCleanup({ isOpen, setIsOpen }) {
  useEffect(() => {
    const cleanup = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', cleanup);
    return () => window.removeEventListener('resize', cleanup);
  }, [isOpen, setIsOpen]);
  return null;
}
