import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, MapPin, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { itemsApi } from '../api/items.js';
import { uploadApi } from '../api/upload.js';
import { geocodeApi } from '../api/geocode.js';
import { resolveImageUrl } from '../utils/imageUrl.js';

const SAMPLE_PHOTOS = [
  { name: 'Drill Machine', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400' },
  { name: 'Camera Gear', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400' },
  { name: 'Mountain Bicycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=400' },
  { name: 'Stand Mixer', url: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&q=80&w=400' },
  { name: 'Waterproof Tent', url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=400' },
  { name: 'Pressure Washer', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400' }
];

export default function AddEditItemModal({ item = null, onClose, onSave, toast }) {
  const isEditing = !!item;
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || 'Electronics');
  const [dailyPrice, setDailyPrice] = useState(item?.dailyPrice !== undefined ? String(item.dailyPrice) : '');
  const [depositAmount, setDepositAmount] = useState(item?.depositAmount !== undefined ? String(item.depositAmount) : '');
  const [condition, setCondition] = useState(item?.condition || 'Good');
  
  // Real new listings do NOT silently receive sample photos. Empty default if not uploaded.
  const [imageUrl, setImageUrl] = useState(item?.images?.[0] || '');

  // Synchronized location and coordinates (no fake Bangalore fallback)
  const [locationLabel, setLocationLabel] = useState(item?.locationLabel || user?.city || '');
  const [latitude, setLatitude] = useState(item?.latitude ?? user?.latitude ?? null);
  const [longitude, setLongitude] = useState(item?.longitude ?? user?.longitude ?? null);

  const [locSuggestions, setLocSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    'Electronics',
    'Power Tools',
    'Photography',
    'Outdoors',
    'Home & Garden',
    'Sports & Fitness',
    'Kitchen & Appliances',
    'General'
  ];

  // Debounced geocoding search for pickup location
  useEffect(() => {
    if (!locationLabel || locationLabel.trim().length < 2) {
      setLocSuggestions([]);
      setActiveSuggestionIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingLoc(true);
      try {
        const results = await geocodeApi.search(locationLabel, controller.signal);
        setLocSuggestions(results || []);
        setActiveSuggestionIndex(-1);
      } catch (err) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          // ignore search error
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingLoc(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationLabel]);

  const handleSelectLocation = (s) => {
    setLocationLabel(s.city || s.label);
    setLatitude(s.latitude);
    setLongitude(s.longitude);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setErrors((prev) => ({ ...prev, location: null }));
  };

  const handleLocationInputChange = (e) => {
    const val = e.target.value;
    setLocationLabel(val);
    // Invalidate old coordinates when text changes
    setLatitude(null);
    setLongitude(null);
    setShowSuggestions(true);
    setActiveSuggestionIndex(-1);
  };

  const handleLocationKeyDown = (e) => {
    if (!showSuggestions || locSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && locSuggestions.length > 0) {
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < locSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : locSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && locSuggestions[activeSuggestionIndex]) {
        e.preventDefault();
        handleSelectLocation(locSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, file: 'File size must be under 5MB.' }));
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({ ...prev, file: 'Only JPEG, PNG, WEBP, and GIF images are allowed.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, file: null }));
    setIsUploading(true);

    try {
      const uploadRes = await uploadApi.uploadImage(file);
      setImageUrl(uploadRes.url);
      if (toast) toast('Photo uploaded successfully! 📸');
    } catch (err) {
      setErrors((prev) => ({ ...prev, file: err.message || 'Upload failed' }));
    } finally {
      setIsUploading(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Item title is required.';
    if (!description.trim()) newErrors.description = 'Item description is required.';
    const priceNum = parseFloat(dailyPrice);
    if (!dailyPrice || isNaN(priceNum) || priceNum <= 0) {
      newErrors.dailyPrice = 'Please enter a valid daily price greater than 0.';
    }
    const depositNum = depositAmount ? parseFloat(depositAmount) : 0;
    if (isNaN(depositNum) || depositNum < 0) {
      newErrors.depositAmount = 'Deposit cannot be negative.';
    }
    if (latitude === null || longitude === null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      newErrors.location = 'Please select a pickup neighborhood from the suggestions to save valid coordinates.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const itemPayload = {
        name: name.trim(),
        description: description.trim(),
        category,
        dailyPrice: parseFloat(dailyPrice),
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        condition,
        images: imageUrl ? [imageUrl] : [],
        locationLabel: locationLabel.trim() || 'Local Area',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      if (isEditing) {
        await itemsApi.updateItem(item.id, itemPayload);
        if (toast) toast('Listing updated successfully! 🛠️');
      } else {
        await itemsApi.createItem(itemPayload);
        if (toast) toast('Listing created successfully! 📦');
      }

      if (onSave) onSave();
      onClose();
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message || 'Failed to save item.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1000 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-edit-modal-title"
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-color)" />
            <h2 id="add-edit-modal-title" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              {isEditing ? 'Edit Listing' : 'List an Item for Rent'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errors.form && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-danger-light)',
                color: 'var(--status-danger)',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="item-name">
                Item Title *
              </label>
              <input
                id="item-name"
                type="text"
                className="form-control"
                placeholder="e.g. Bosch Hammer Drill 18V"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {errors.name && (
                <span style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', display: 'block' }}>
                  {errors.name}
                </span>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="item-category">
                Category
              </label>
              <select
                id="item-category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="item-description">
                Description *
              </label>
              <textarea
                id="item-description"
                className="form-control"
                rows={3}
                placeholder="Describe features, accessories, condition, and any usage instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              {errors.description && (
                <span style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', display: 'block' }}>
                  {errors.description}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="item-price">
                  Daily Rental (₹) *
                </label>
                <input
                  id="item-price"
                  type="number"
                  min="1"
                  step="1"
                  className="form-control"
                  placeholder="e.g. 250"
                  value={dailyPrice}
                  onChange={(e) => setDailyPrice(e.target.value)}
                  required
                />
                {errors.dailyPrice && (
                  <span style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', display: 'block' }}>
                    {errors.dailyPrice}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="item-deposit">
                  Refundable Deposit (₹)
                </label>
                <input
                  id="item-deposit"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  placeholder="e.g. 1000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                {errors.depositAmount && (
                  <span style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', display: 'block' }}>
                    {errors.depositAmount}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="item-condition">
                  Condition
                </label>
                <select
                  id="item-condition"
                  className="form-control"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="item-location">
                  Pickup Location *
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    id="item-location"
                    type="text"
                    role="combobox"
                    aria-expanded={showSuggestions && locSuggestions.length > 0}
                    aria-autocomplete="list"
                    aria-controls="item-loc-suggestions-list"
                    aria-activedescendant={activeSuggestionIndex >= 0 ? `item-loc-opt-${activeSuggestionIndex}` : undefined}
                    className="form-control"
                    style={{ paddingLeft: '36px' }}
                    placeholder="Search pickup neighborhood..."
                    value={locationLabel}
                    onChange={handleLocationInputChange}
                    onKeyDown={handleLocationKeyDown}
                    onFocus={() => {
                      if (locSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    required
                  />

                  {/* Geocoding suggestions dropdown */}
                  {showSuggestions && locSuggestions.length > 0 && (
                    <ul
                      id="item-loc-suggestions-list"
                      role="listbox"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        zIndex: 100,
                        listStyle: 'none',
                        padding: '4px 0',
                        margin: '4px 0 0 0'
                      }}
                    >
                      {locSuggestions.map((s, idx) => (
                        <li
                          key={idx}
                          id={`item-loc-opt-${idx}`}
                          role="option"
                          aria-selected={idx === activeSuggestionIndex}
                          onMouseDown={() => handleSelectLocation(s)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            backgroundColor: idx === activeSuggestionIndex ? 'var(--bg-hover, rgba(0,0,0,0.06))' : 'transparent',
                            borderBottom: idx < locSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <strong>{s.city || 'Neighborhood'}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.label}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {isSearchingLoc && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Searching locations...
                    </span>
                  )}
                </div>
                {errors.location && (
                  <span style={{ fontSize: '12px', color: 'var(--status-danger)', marginTop: '4px', display: 'block' }}>
                    {errors.location}
                  </span>
                )}
                {latitude !== null && longitude !== null && (
                  <span style={{ fontSize: '11px', color: 'var(--status-success)', marginTop: '4px', display: 'block' }}>
                    ✓ Valid coordinates synchronized
                  </span>
                )}
              </div>
            </div>

            {/* Photo Selection and Upload */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Item Photo (Optional)</label>

              {/* Upload trigger */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Upload size={16} />
                  {isUploading ? 'Uploading...' : 'Upload from device'}
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Max 5MB (JPG, PNG, WEBP)</span>
              </div>
              {errors.file && (
                <span style={{ fontSize: '12px', color: 'var(--status-danger)', marginBottom: '8px', display: 'block' }}>
                  {errors.file}
                </span>
              )}

              {/* Sample Photos Gallery */}
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Or choose from sample library:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {SAMPLE_PHOTOS.map((p) => {
                  const isSelected = imageUrl === p.url;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setImageUrl(p.url)}
                      style={{
                        padding: 0,
                        border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '1/1',
                        position: 'relative'
                      }}
                      title={p.name}
                    >
                      <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  );
                })}
              </div>

              {/* Selected Image Preview */}
              {imageUrl ? (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={resolveImageUrl(imageUrl)}
                    alt="Preview"
                    style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Selected photo attached</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{ background: 'none', border: 'none', color: 'var(--status-danger)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No photo attached. An icon representing the category will be displayed.
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || isUploading}
                style={{ minWidth: '120px' }}
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Listing' : 'Publish Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
