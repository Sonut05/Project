import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, User, Phone, MapPin, Edit3, MessageSquare, Send, Eye, Camera, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { usersApi } from '../api/users.js';
import { uploadApi } from '../api/upload.js';
import { messagesApi } from '../api/messages.js';
import { geocodeApi } from '../api/geocode.js';
import { formatRelativeTime } from '../utils/dateUtils.js';
import { resolveImageUrl, resolveAvatarUrl, ITEM_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../utils/imageUrl.js';

const PRESET_AVATARS = [
  AVATAR_PLACEHOLDER
];

export default function ProfileView({ userId: propUserId, onClose = null, toast, onNavigateItem }) {
  const { id: routeUserId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuth();

  const targetUserId = propUserId || routeUserId || authUser?.id;
  const isSelf = authUser && targetUserId === authUser.id;

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(targetUserId));
  const [error, setError] = useState(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPrivateAddress, setEditPrivateAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCoords, setEditCoords] = useState({ lat: null, lng: null });
  const [isSaving, setIsSaving] = useState(false);

  // Profile photo upload states
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // City suggestions
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);

  // Real Messaging modal state
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!targetUserId) return;

    let isMounted = true;
    async function loadData() {
      try {
        const [profileData, listingsData, reviewsData] = await Promise.all([
          usersApi.getProfile(targetUserId),
          usersApi.getUserListings(targetUserId),
          usersApi.getUserReviews(targetUserId)
        ]);

        if (isMounted) {
          setProfile(profileData);
          setListings(Array.isArray(listingsData) ? listingsData : (listingsData?.items || []));
          setReviews(Array.isArray(reviewsData) ? reviewsData : (reviewsData?.reviews || []));

          // Populate edit fields
          setEditName(profileData.name || '');
          setEditPhone(profileData.phone || '');
          setEditPrivateAddress(profileData.privateAddress || '');
          setEditCity(profileData.city || '');
          setEditAvatar(profileData.avatarUrl || PRESET_AVATARS[0]);
          setEditCoords({ lat: profileData.latitude, lng: profileData.longitude });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load user profile');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [targetUserId]);

  // Debounced geocoding search for city
  useEffect(() => {
    if (!isEditing || !editCity.trim() || editCity.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await geocodeApi.search(editCity, controller.signal);
        setCitySuggestions(res || []);
      } catch {
        // Ignored aborted
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [editCity, isEditing]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file size must be under 5MB.');
      if (toast) toast('File size too large (max 5MB)');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Only JPEG, PNG, WEBP, and GIF images are supported.');
      if (toast) toast('Please upload a valid image file (JPG, PNG, WEBP, GIF)');
      return;
    }

    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const res = await uploadApi.uploadImage(file);
      setEditAvatar(res.url);
      if (toast) toast('Profile picture uploaded successfully! 📸');
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo');
      if (toast) toast(`Upload error: ${err.message || 'Failed to upload'}`);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      if (toast) toast('Name cannot be empty.');
      return;
    }

    if (editCity.trim() && (editCoords.lat === null || editCoords.lng === null || isNaN(editCoords.lat) || isNaN(editCoords.lng))) {
      if (toast) toast('Please select your city/neighborhood from the suggestions to set valid coordinates.');
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        privateAddress: editPrivateAddress.trim() || null,
        city: editCity.trim() || null,
        avatarUrl: editAvatar,
        latitude: editCity.trim() ? editCoords.lat : null,
        longitude: editCity.trim() ? editCoords.lng : null
      };

      const res = await usersApi.updateMe(updateData);
      setProfile((prev) => ({ ...prev, ...res.user }));
      updateUser(res.user);
      setIsEditing(false);
      if (toast) toast('Profile updated successfully! ✅');
    } catch (err) {
      if (toast) toast(`Error: ${err.message || 'Failed to update profile'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Open real messaging thread
  const handleOpenMessaging = async () => {
    if (!authUser) {
      if (toast) toast('Please log in to message neighbors.');
      return;
    }

    try {
      const conv = await messagesApi.startConversation(targetUserId);
      setConversation(conv);
      const msgs = await messagesApi.getMessages(conv.id);
      setMessages(Array.isArray(msgs) ? msgs : (msgs?.messages || []));
      setIsMessageOpen(true);
    } catch (err) {
      if (toast) toast(`Error: ${err.message || 'Could not start conversation'}`);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !conversation) return;

    setIsSending(true);
    try {
      const newMsg = await messagesApi.sendMessage(conversation.id, messageInput.trim());
      setMessages((prev) => [...prev, newMsg]);
      setMessageInput('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      if (toast) toast(`Error: ${err.message || 'Failed to send message'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    const loadingEl = (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading profile...</p>
      </div>
    );
    return onClose ? loadingEl : <div className="main-content">{loadingEl}</div>;
  }

  if (error || !profile) {
    const errorEl = (
      <div className="card" style={{ maxWidth: '480px', margin: '40px auto', padding: '48px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--status-danger)' }}>Profile Not Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>{error || 'User does not exist.'}</p>
        <button
          type="button"
          onClick={() => (onClose ? onClose() : navigate(-1))}
          className="btn btn-secondary"
          style={{ marginTop: '16px' }}
        >
          Go Back
        </button>
      </div>
    );
    return onClose ? errorEl : <div className="main-content">{errorEl}</div>;
  }

  const ratingAvg = profile.stats?.rating ? `★ ${profile.stats.rating}` : '★ New';

  const content = (
    <div className="card" style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px' }}>
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={22} color="var(--accent-color)" />
          <h1 style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)', margin: 0 }}>
            {isSelf ? 'My Profile' : `${profile.name}'s Profile`}
          </h1>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Profile Photo Upload Section */}
          <div
            style={{
              padding: '18px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '8px'
            }}
          >
            <label className="form-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} color="var(--accent-color)" /> Profile Photo
            </label>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Avatar Preview */}
              <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                <img
                  src={resolveAvatarUrl(editAvatar, AVATAR_PLACEHOLDER)}
                  alt="Profile Avatar Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--accent-color)',
                    backgroundColor: 'var(--bg-tertiary)'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = AVATAR_PLACEHOLDER;
                  }}
                />
                {isUploadingPhoto && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ width: '22px', height: '22px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto || isSaving}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto || isSaving}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      padding: '8px 14px'
                    }}
                  >
                    <Upload size={15} />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput((prev) => !prev)}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      padding: '8px 12px'
                    }}
                  >
                    <ImageIcon size={15} />
                    <span>{showUrlInput ? 'Hide URL' : 'Image Link'}</span>
                  </button>

                  {editAvatar && editAvatar !== AVATAR_PLACEHOLDER && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditAvatar(AVATAR_PLACEHOLDER);
                        setPhotoError(null);
                        if (toast) toast('Photo reset to default avatar');
                      }}
                      className="btn-ghost"
                      style={{
                        color: 'var(--status-danger)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px'
                      }}
                      title="Remove custom photo and reset to default avatar"
                    >
                      <Trash2 size={15} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Upload a photo from your computer/device (JPG, PNG, WEBP, GIF up to 5MB).
                </span>

                {/* Optional Web URL input */}
                {showUrlInput && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="Paste image URL (e.g. https://...)"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: '36px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        if (customUrl.trim()) {
                          setEditAvatar(customUrl.trim());
                          setCustomUrl('');
                          setShowUrlInput(false);
                          if (toast) toast('Photo URL applied! 📸');
                        }
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}

                {photoError && (
                  <span style={{ fontSize: '12px', color: 'var(--status-danger)', display: 'block' }}>
                    {photoError}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="edit-name">
              Full Name *
            </label>
            <input
              id="edit-name"
              type="text"
              className="form-control"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="edit-phone">
              Phone Number
            </label>
            <input
              id="edit-phone"
              type="tel"
              className="form-control"
              placeholder="+91 98765 43210"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0, position: 'relative' }}>
            <label className="form-label" htmlFor="edit-city">
              City / Neighborhood
            </label>
            <input
              id="edit-city"
              type="text"
              role="combobox"
              aria-expanded={showCitySuggestions && citySuggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="profile-city-suggestions"
              aria-activedescendant={activeCityIndex >= 0 ? `profile-city-opt-${activeCityIndex}` : undefined}
              className="form-control"
              placeholder="e.g. Indiranagar, Bengaluru"
              value={editCity}
              onChange={(e) => {
                setEditCity(e.target.value);
                // Immediately invalidate old coordinates when location text changes
                setEditCoords({ lat: null, lng: null });
                if (e.target.value.trim().length < 2) {
                  setCitySuggestions([]);
                }
                setShowCitySuggestions(true);
                setActiveCityIndex(-1);
              }}
              onKeyDown={(e) => {
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
                    const s = citySuggestions[activeCityIndex];
                    setEditCity(s.city || s.label);
                    setEditCoords({ lat: s.latitude, lng: s.longitude });
                    setShowCitySuggestions(false);
                    setActiveCityIndex(-1);
                  }
                } else if (e.key === 'Escape') {
                  setShowCitySuggestions(false);
                  setActiveCityIndex(-1);
                }
              }}
              onFocus={() => setShowCitySuggestions(true)}
            />
            {showCitySuggestions && citySuggestions.length > 0 && (
              <ul
                id="profile-city-suggestions"
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
                    id={`profile-city-opt-${idx}`}
                    role="option"
                    aria-selected={idx === activeCityIndex}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      backgroundColor: idx === activeCityIndex ? 'var(--bg-hover, rgba(0,0,0,0.06))' : 'transparent',
                      color: 'var(--text-primary)'
                    }}
                    onMouseDown={() => {
                      setEditCity(s.city || s.label);
                      setEditCoords({ lat: s.latitude, lng: s.longitude });
                      setShowCitySuggestions(false);
                      setActiveCityIndex(-1);
                    }}
                  >
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="edit-private-address">
              Private Home Address (Kept strictly private, never visible publicly)
            </label>
            <input
              id="edit-private-address"
              type="text"
              className="form-control"
              placeholder="Flat / House number, Street name"
              value={editPrivateAddress}
              onChange={(e) => setEditPrivateAddress(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsEditing(false);
                setEditAvatar(profile?.avatarUrl || AVATAR_PLACEHOLDER);
                setPhotoError(null);
                setShowUrlInput(false);
              }}
              disabled={isSaving || isUploadingPhoto}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || isUploadingPhoto}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : (
        /* Profile Display */
        <>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src={resolveAvatarUrl(profile.avatarUrl, AVATAR_PLACEHOLDER)}
              alt={profile.name}
              style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-color)' }}
              onError={(e) => {
                e.currentTarget.src = AVATAR_PLACEHOLDER;
              }}
            />

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>{profile.name}</h3>
                <span
                  style={{
                    backgroundColor: 'var(--accent-color-light)',
                    color: 'var(--accent-color)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  {ratingAvg}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                <MapPin size={14} color="var(--accent-color)" />
                <span>{profile.city || 'Neighborhood Neighbor'}</span>
              </div>

              {profile.phone && isSelf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  <Phone size={14} />
                  <span>{profile.phone}</span>
                </div>
              )}

              {isSelf && profile.privateAddress && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Private Address: <em>{profile.privateAddress}</em>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                    {profile.stats?.itemsCount || 0}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Listings</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                    {profile.stats?.completedLends || 0}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Items Lent</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                    {profile.stats?.completedBorrows || 0}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Borrowed</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isSelf ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenMessaging}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
                >
                  <MessageSquare size={16} /> Send Message
                </button>
              )}
            </div>
          </div>

          {/* User Listings */}
          <section style={{ marginTop: '36px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
              Listings by {isSelf ? 'You' : profile.name} ({listings.length})
            </h4>
            {listings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No active listings published yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {listings.map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '140px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={resolveImageUrl(item.images?.[0], ITEM_PLACEHOLDER)}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'contrast(1.08) brightness(1.08)'
                        }}
                        onError={(e) => {
                          e.currentTarget.src = ITEM_PLACEHOLDER;
                        }}
                      />
                    </div>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '10px 0 4px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-color)' }}>
                        ₹{item.dailyPrice}/day
                      </span>
                      <span className={`badge ${item.availability === 'Available' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {item.availability || 'Available'}
                      </span>
                    </div>

                    {/* Explicit Item Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {isSelf ? (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate('/my-items')}
                            className="btn btn-outline"
                            style={{ flex: 1, height: '34px', minHeight: '34px', fontSize: '12px', padding: '4px 8px', gap: '4px' }}
                            aria-label={`Manage ${item.name}`}
                          >
                            <Edit3 size={14} /> Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateItem) onNavigateItem(item.id);
                              else navigate(`/items/${item.id}`);
                            }}
                            className="btn btn-primary"
                            style={{ flex: 1, height: '34px', minHeight: '34px', fontSize: '12px', padding: '4px 8px', gap: '4px' }}
                            aria-label={`View ${item.name}`}
                          >
                            <Eye size={14} /> View
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateItem) onNavigateItem(item.id);
                            else navigate(`/items/${item.id}`);
                          }}
                          className="btn btn-primary"
                          style={{ width: '100%', height: '34px', minHeight: '34px', fontSize: '12px', padding: '4px 8px', gap: '6px' }}
                          aria-label={`View details for ${item.name}`}
                        >
                          <Eye size={14} /> View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* User Reviews */}
          <section style={{ marginTop: '36px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
              Reviews Received ({reviews.length})
            </h4>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No neighbor reviews yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{rev.author?.name || 'Neighbor'}</span>
                      <span style={{ color: 'var(--status-warning)', fontWeight: '700', fontSize: '13px' }}>
                        {'★'.repeat(rev.rating)}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {rev.comment}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      {formatRelativeTime(rev.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Real Messaging Modal */}
      {isMessageOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="messaging-modal-title"
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '480px',
              height: '520px',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="var(--accent-color)" />
                <h3 id="messaging-modal-title" style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  Message {profile.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMessageOpen(false)}
                aria-label="Close messages"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Message log */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: 'auto' }}>
                  Send a message to coordinate pickup, ask questions, or discuss rental details.
                </div>
              ) : (
                messages.map((m) => {
                  const isSentByMe = authUser && m.senderId === authUser.id;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isSentByMe ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: isSentByMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: isSentByMe ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                        color: isSentByMe ? 'white' : 'var(--text-primary)',
                        fontSize: '13px',
                        lineHeight: 1.4
                      }}
                    >
                      <div>{m.body}</div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: isSentByMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                          marginTop: '4px',
                          textAlign: 'right'
                        }}
                      >
                        {formatRelativeTime(m.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form
              onSubmit={handleSendMessage}
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <input
                type="text"
                className="form-control"
                placeholder="Type your message..."
                style={{ flex: 1, height: '40px' }}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSending || !messageInput.trim()}
                style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (onClose) {
    return content;
  }

  return (
    <div className="main-content">
      {content}
    </div>
  );
}
