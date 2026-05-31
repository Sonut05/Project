import React, { useState } from 'react';
import { X, Award, Star, Mail, Phone, MapPin, Edit3, CheckCircle, Calendar, Upload, Link } from 'lucide-react';
import { getDb, dbOps } from '../utils/mockDb';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150'
];

const FALLBACK_ADDRESSES = [
  { name: "No. 15, 27th Main Road, HSR Layout, Sector 1, Bangalore, Karnataka", lat: 12.9100, lng: 77.6400 },
  { name: "Flat 302, Green Glen Layout, Bellandur, Bangalore, Karnataka", lat: 12.9350, lng: 77.6750 },
  { name: "Villa 48, Prestige Shantiniketan, Whitefield, Bangalore, Karnataka", lat: 12.9698, lng: 77.7500 },
  { name: "Apt 501, Sobha Carnation, Sarjapur Road, Bangalore, Karnataka", lat: 12.9150, lng: 77.6500 },
  { name: "Shanthi Nilaya, 4th Block, Jayanagar, Bangalore, Karnataka", lat: 12.9300, lng: 77.5800 },
  { name: "Sree Nivasa, 15th Cross, JP Nagar Phase 2, Bangalore, Karnataka", lat: 12.9060, lng: 77.5900 },
  { name: "80 Feet Road, Koramangala 4th Block, Bangalore, Karnataka", lat: 12.9350, lng: 77.6250 },
  { name: "Golden Heights Apartment, Rajajinagar, Bangalore, Karnataka", lat: 12.9900, lng: 77.5500 },
  { name: "14th Cross, Margosa Road, Malleshwaram, Bangalore, Karnataka", lat: 13.0030, lng: 77.5700 },
  { name: "Lakeview Enclave, Hebbal, Bangalore, Karnataka", lat: 13.0350, lng: 77.5970 }
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

export default function ProfileView({ userId, onClose = null, toast, onNavigateItem, onNavigatePage }) {
  const db = getDb();
  const activeUserId = db.currentUserId || 'user-self';
  const resolvedUserId = userId === 'user-self' ? activeUserId : userId;
  const profile = dbOps.getUserProfile(resolvedUserId);
  const isSelf = resolvedUserId === activeUserId;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editAddress, setEditAddress] = useState(profile?.address || '');
  const [editCity, setEditCity] = useState(profile?.city || '');
  const [editAvatar, setEditAvatar] = useState(profile?.avatar || PRESET_AVATARS[0]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCitySuggestions, setFilteredCitySuggestions] = useState([]);
  
  const [editCoords, setEditCoords] = useState({ lat: profile?.lat || 12.9716, lng: profile?.lng || 77.5946 });
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Debounced geocoding effect for user city input
  React.useEffect(() => {
    if (!editCity.trim()) {
      setFilteredCitySuggestions(FALLBACK_CITIES.slice(0, 5));
      return;
    }

    const exactMatch = FALLBACK_CITIES.find(c => c.name.toLowerCase() === editCity.toLowerCase());
    if (exactMatch) {
      setEditCoords({ lat: exactMatch.lat, lng: exactMatch.lng });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingCity(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(editCity)}`
        );
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const suggestions = data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          setFilteredCitySuggestions(suggestions);
        } else {
          const filtered = FALLBACK_CITIES.filter(c =>
            c.name.toLowerCase().includes(editCity.toLowerCase())
          );
          setFilteredCitySuggestions(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error("Profile city geocoding error:", err);
        const filtered = FALLBACK_CITIES.filter(c =>
          c.name.toLowerCase().includes(editCity.toLowerCase())
        );
        setFilteredCitySuggestions(filtered.slice(0, 5));
      } finally {
        setIsLoadingCity(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [editCity]);

  // Debounced geocoding effect for user handoff address input
  React.useEffect(() => {
    if (!editAddress.trim()) {
      setFilteredSuggestions(FALLBACK_ADDRESSES.slice(0, 4));
      return;
    }

    const exactMatch = FALLBACK_ADDRESSES.find(a => a.name.toLowerCase() === editAddress.toLowerCase());
    if (exactMatch) {
      setEditCoords({ lat: exactMatch.lat, lng: exactMatch.lng });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingAddress(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(`${editAddress} ${editCity}`)}`
        );
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const suggestions = data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          setFilteredSuggestions(suggestions);
        } else {
          const filtered = FALLBACK_ADDRESSES.filter(a =>
            a.name.toLowerCase().includes(editAddress.toLowerCase())
          );
          setFilteredSuggestions(filtered.slice(0, 4));
        }
      } catch (err) {
        console.error("Profile address geocoding error:", err);
        const filtered = FALLBACK_ADDRESSES.filter(a =>
          a.name.toLowerCase().includes(editAddress.toLowerCase())
        );
        setFilteredSuggestions(filtered.slice(0, 4));
      } finally {
        setIsLoadingAddress(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [editAddress]);

  const handleAddressChange = (val) => {
    setEditAddress(val);
    setShowSuggestions(true);
  };

  const handleAddressFocus = () => {
    if (!editAddress.trim()) {
      setFilteredSuggestions(FALLBACK_ADDRESSES.slice(0, 4));
    }
    setShowSuggestions(true);
  };

  const handleAddressBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleCityChange = (val) => {
    setEditCity(val);
    setShowCitySuggestions(true);
  };

  const handleCityFocus = () => {
    if (!editCity.trim()) {
      setFilteredCitySuggestions(FALLBACK_CITIES.slice(0, 5));
    }
    setShowCitySuggestions(true);
  };

  const handleCityBlur = () => {
    setTimeout(() => {
      setShowCitySuggestions(false);
    }, 200);
  };

  if (!profile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>User profile not found.</h3>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast("Image is too large! Please select an image under 2MB. ⚠️");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result);
        toast("Local image loaded! Click Save to apply changes. 📸");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    let finalLat = editCoords.lat;
    let finalLng = editCoords.lng;
    if (filteredSuggestions.length > 0 && finalLat === (profile?.lat || 12.9716) && finalLng === (profile?.lng || 77.5946)) {
      finalLat = filteredSuggestions[0].lat;
      finalLng = filteredSuggestions[0].lng;
    }
    dbOps.updateProfile({
      name: editName,
      phone: editPhone,
      address: editAddress,
      city: editCity,
      avatar: editAvatar,
      lat: finalLat,
      lng: finalLng
    });
    setIsEditing(false);
    toast('Profile updated successfully! ✨');
  };

  const handleMessageUser = () => {
    toast(`Message thread initiated with ${profile.name}! 💬`);
  };

  const ratingAvg = profile.rating || 5.0;

  return (
    <div 
      className="card" 
      style={{ 
        maxWidth: '720px', 
        margin: '0 auto', 
        position: 'relative',
        animation: 'modal-appear 0.2s ease-out'
      }}
    >
      {/* Close button if rendered in modal context */}
      {onClose && (
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: 0
          }}
          title="Close profile"
        >
          <X size={24} />
        </button>
      )}

      {/* Main header layout */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px', 
          alignItems: 'center', 
          textAlign: 'center',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px'
        }}
        ref={(el) => {
          if (el) {
            el.style.setProperty('flex-direction', window.innerWidth >= 600 ? 'row' : 'column');
            el.style.setProperty('text-align', window.innerWidth >= 600 ? 'left' : 'center');
          }
        }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <img 
            src={profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
            alt={profile.name} 
            style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-color)' }}
          />
          {profile.verified && (
            <div 
              style={{ 
                position: 'absolute', 
                bottom: '2px', 
                right: '2px', 
                backgroundColor: 'var(--accent-color)', 
                color: 'white',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                boxShadow: 'var(--shadow-sm)'
              }}
              title="Verified Neighbor Trust Badge"
            >
              <Award size={16} />
            </div>
          )}
        </div>

        {/* Profile metadata */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}
               ref={(el) => {
                 if (el) {
                   el.style.setProperty('justify-content', window.innerWidth >= 600 ? 'flex-start' : 'center');
                 }
               }}
          >
            <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
              {isSelf ? (profile.name || 'Set Your Name') : profile.name}
            </h2>
            {profile.verified && (
              <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                Verified Neighbor
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px', flexWrap: 'wrap' }}
               ref={(el) => {
                 if (el) {
                   el.style.setProperty('justify-content', window.innerWidth >= 600 ? 'flex-start' : 'center');
                 }
               }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={16} /> {profile.city || 'Set Location'}
            </span>
            <span>Member since {profile.memberSince}</span>
          </div>

          {/* Core Stats Row */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px' }}
               ref={(el) => {
                 if (el) {
                   el.style.setProperty('justify-content', window.innerWidth >= 600 ? 'flex-start' : 'center');
                 }
               }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>RATING SCORE</span>
              <strong style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-color)' }}>
                <Star size={18} fill="var(--status-warning)" color="var(--status-warning)" />
                {ratingAvg.toFixed(1)}
              </strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>COMPLETED RENTALS</span>
              <strong style={{ fontSize: '20px', color: 'var(--text-primary)' }}>
                {profile.totalCompletedRentals || 0}
              </strong>
            </div>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isSelf ? (
            <>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-outline"
                style={{ alignSelf: 'center' }}
              >
                <Edit3 size={16} /> Edit Profile
              </button>
              <button 
                onClick={() => {
                  dbOps.logout();
                  if (onClose) onClose();
                }}
                className="btn btn-outline"
                style={{ alignSelf: 'center', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
              >
                Log Out
              </button>
            </>
          ) : (
            <button 
              onClick={handleMessageUser}
              className="btn btn-primary"
              style={{ alignSelf: 'center' }}
            >
              Send Message 💬
            </button>
          )}
        </div>
      </div>

      {/* Profile Edit Form overlay */}
      {isSelf && isEditing && (
        <form onSubmit={handleSaveProfile} className="no-print" style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Update Profile Details</h3>
          
          {/* Avatar Edit Section */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Profile Photo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              
              {/* Photo Preview */}
              <div style={{ position: 'relative' }}>
                <img 
                  src={editAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                  alt="Avatar Preview" 
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-color)' }}
                />
              </div>

              {/* Edit Options */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Choose a preset or upload your own photo:</div>
                
                {/* Presets */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setEditAvatar(url)}
                      style={{
                        border: editAvatar === url ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        padding: 0,
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        transform: editAvatar === url ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <img src={url} alt={`Preset ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>

                {/* Upload & Link Options */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  
                  {/* File Upload Trigger */}
                  <label 
                    className="btn btn-outline" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '6px 12px', 
                      fontSize: '12px', 
                      minHeight: '32px',
                      cursor: 'pointer' 
                    }}
                  >
                    <Upload size={14} /> Upload Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  {/* Paste URL option */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <Link size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                      <input 
                        type="url" 
                        placeholder="Or paste photo link (URL)..." 
                        value={editAvatar.startsWith('data:') ? '' : editAvatar} 
                        onChange={(e) => setEditAvatar(e.target.value)} 
                        className="form-control"
                        style={{ 
                          paddingLeft: '30px', 
                          fontSize: '12px', 
                          height: '32px', 
                          paddingTop: '4px',
                          paddingBottom: '4px'
                        }}
                      />
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="p-name">Full Name</label>
            <input 
              type="text" 
              id="p-name"
              className="form-control" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="p-phone">Phone Number</label>
              <input 
                type="text" 
                id="p-phone"
                className="form-control" 
                placeholder="+91 XXXXX XXXXX"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" htmlFor="p-city">City, State</label>
              <input 
                type="text"
                id="p-city"
                className="form-control"
                placeholder="e.g., Mumbai, Maharashtra"
                value={editCity}
                onChange={(e) => handleCityChange(e.target.value)}
                onFocus={handleCityFocus}
                onBlur={handleCityBlur}
                autoComplete="off"
              />
              
              {/* City suggestions dropdown */}
              {showCitySuggestions && (filteredCitySuggestions.length > 0 || isLoadingCity) && (
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
                  {isLoadingCity && (
                    <li style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span>🔍 Searching India cities...</span>
                    </li>
                  )}
                  {filteredCitySuggestions.map((c, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCity(c.name);
                          setEditCoords({ lat: c.lat, lng: c.lng });
                          setShowCitySuggestions(false);
                          toast(`City set to ${c.name.split(',')[0]}! 🌆`);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
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
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="p-addr">Handoff/Pickup Address</label>
            <input 
              type="text" 
              id="p-addr"
              className="form-control" 
              placeholder="Start typing or select a nearby address suggestion..."
              value={editAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={handleAddressFocus}
              onBlur={handleAddressBlur}
              autoComplete="off"
            />
            
            {/* Auto-Suggestion Dropdown */}
            {showSuggestions && (filteredSuggestions.length > 0 || isLoadingAddress) && (
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
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                <li style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isLoadingAddress ? "Searching Address..." : "Suggested Nearby Addresses"}
                </li>
                {filteredSuggestions.map((addr, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditAddress(addr.name);
                        setEditCoords({ lat: addr.lat, lng: addr.lng });
                        setShowSuggestions(false);
                        toast("Address applied! 📍");
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
                      📍 <strong>{addr.name.split(',')[0]}</strong> <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{addr.name.split(',').slice(1).join(',')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)} 
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* Phone and address display in personal view */}
      {isSelf && !isEditing && (profile.phone || profile.address) && (
        <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>PHONE NUMBER</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{profile.phone || 'Not added'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>PICKUP ADDRESS</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{profile.address || 'Not added'}</strong>
          </div>
        </div>
      )}

      {/* Bottom tabs section */}
      <h3 style={{ fontSize: '18px', marginBottom: '14px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
        {isSelf ? 'My Active Listings' : `Currently Lending by ${profile.name.split(' ')[0]}`}
      </h3>

      {profile.listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No active items listed at the moment.</p>
          {isSelf && (
            <button 
              onClick={() => onNavigatePage('my-items')}
              className="btn btn-primary" 
              style={{ marginTop: '16px' }}
            >
              Add Your First Item
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {profile.listings.map((item) => (
            <div 
              key={item.id} 
              className="card" 
              style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => {
                if (onNavigateItem) {
                  onNavigateItem(item.id);
                  if (onClose) onClose();
                }
              }}
            >
              <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
              <div style={{ padding: '12px' }}>
                <span className={`badge ${item.availability === 'Available' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px', padding: '2px 6px', marginBottom: '6px' }}>
                  {item.availability}
                </span>
                <h4 style={{ fontSize: '14px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {item.name}
                </h4>
                <strong style={{ color: 'var(--accent-color)', fontSize: '14px', display: 'block', marginTop: '4px' }}>
                  ₹{item.dailyPrice}<span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/day</span>
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews log Section */}
      <h3 style={{ fontSize: '18px', marginTop: '32px', marginBottom: '14px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
        Neighbor Reviews ({profile.reviews.length})
      </h3>

      {profile.reviews.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No reviews yet. Be the first to transact and review!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profile.reviews.map((rev, idx) => (
            <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px' }}>{rev.reviewerName || 'Anonymous Neighbor'}</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{rev.date}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', margin: '4px 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={14} 
                    fill={star <= rev.rating ? 'var(--status-warning)' : 'none'} 
                    color={star <= rev.rating ? 'var(--status-warning)' : 'var(--border-color)'} 
                  />
                ))}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                "{rev.comment}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
