import React, { useState, useEffect } from 'react';
import { X, Sparkles, MapPin, Camera } from 'lucide-react';
import { getDb, dbOps } from '../utils/mockDb';

const PRESET_PHOTOS = [
  { name: 'Drill Machine', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400' },
  { name: 'Camera Gear', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400' },
  { name: 'Mountain Bicycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=400' },
  { name: 'Stand Mixer', url: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&q=80&w=400' },
  { name: 'Waterproof Tent', url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=400' },
  { name: 'Lawn Mower', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=400' },
];

export default function AddEditItemModal({ item = null, onClose, onSave, toast }) {
  const isEditing = !!item;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [dailyPrice, setDailyPrice] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [condition, setCondition] = useState('Good');
  const [imageUrl, setImageUrl] = useState(PRESET_PHOTOS[0].url);
  const [locationName, setLocationName] = useState(() => {
    if (item && item.location) return item.location;
    const db = getDb();
    const currentUser = db.users[db.currentUserId || 'user-self'];
    return currentUser?.address || currentUser?.city || 'HSR Layout, Bangalore';
  });

  useEffect(() => {
    if (isEditing && item) {
      setName(item.name);
      setDescription(item.description);
      setCategory(item.category);
      setDailyPrice(item.dailyPrice);
      setDepositAmount(item.depositAmount || '');
      setCondition(item.condition);
      setImageUrl(item.images[0]);
      if (item.location) {
        setLocationName(item.location);
      }
    }
  }, [isEditing, item]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast('Error: File size exceeds 5MB limit! ⚠️');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        toast('Photo uploaded successfully! 📸');
      };
      reader.onerror = () => {
        toast('Error reading file! ⚠️');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter an item name');
    if (!description.trim()) return alert('Please provide a short description so neighbors know what they are renting');
    if (!dailyPrice || parseFloat(dailyPrice) <= 0) return alert('Please set a valid daily rental price');

    const itemPayload = {
      name,
      description,
      category,
      dailyPrice: parseFloat(dailyPrice),
      depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
      condition,
      images: [imageUrl],
      location: locationName,
    };

    if (isEditing) {
      dbOps.editItem(item.id, itemPayload);
      toast('Item updated successfully! 🛠️');
    } else {
      dbOps.addItem(itemPayload);
      toast('Item added successfully! Listings with photos get 3x more requests! 📈');
    }
    
    onSave();
    onClose();
  };

  const categories = [
    'Electronics', 'Tools & Hardware', 'Sports & Fitness', 'Furniture & Home', 
    'Kitchen & Appliances', 'Vehicles', 'Books & Education', 'Other'
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        
        {/* Modal Header */}
        <div 
          style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}
        >
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-color)' }} />
            {isEditing ? 'Edit Item Details' : 'Add a New Item to Rent'}
          </h2>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          
          <div className="form-group">
            <label className="form-label" htmlFor="item-name">Item Name</label>
            <input 
              type="text" 
              id="item-name"
              className="form-control" 
              placeholder="e.g. Bosch Drill Machine, DSLR Camera" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="item-desc">Description</label>
            <textarea 
              id="item-desc"
              className="form-control" 
              rows="3"
              style={{ resize: 'vertical' }}
              placeholder="Describe your item, accessories, how it works, and pickup instructions..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="item-cat">Category</label>
              <select 
                id="item-cat"
                className="form-control"
                style={{ height: '48px' }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Item Condition</label>
              <div style={{ display: 'flex', gap: '8px', height: '48px', alignItems: 'center' }}>
                {['New', 'Good', 'Fair'].map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setCondition(cond)}
                    style={{
                      flex: 1,
                      height: '100%',
                      border: '2px solid',
                      borderColor: condition === cond ? 'var(--accent-color)' : 'var(--border-color)',
                      backgroundColor: condition === cond ? 'var(--accent-color-light)' : 'transparent',
                      color: condition === cond ? 'var(--accent-color)' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="item-price">Daily Price (₹)</label>
              <input 
                type="number" 
                id="item-price"
                className="form-control" 
                placeholder="250" 
                value={dailyPrice}
                onChange={(e) => setDailyPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="item-deposit">Refundable Deposit (₹ - optional)</label>
              <input 
                type="number" 
                id="item-deposit"
                className="form-control" 
                placeholder="500" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Photo Upload / Gallery & Camera Picker */}
          <div className="form-group">
            <label className="form-label">Listing Photo</label>
            
            {/* Custom Gallery/Camera File Uploader */}
            <input 
              type="file" 
              accept="image/*" 
              id="photo-file-input" 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            
            <div 
              onClick={() => document.getElementById('photo-file-input').click()}
              style={{
                border: '2px dashed var(--accent-color)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--accent-color-light)',
                transition: 'all 0.2s',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '120px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(29, 158, 117, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-color-light)';
              }}
            >
              {imageUrl && (imageUrl.startsWith('data:image/') || !PRESET_PHOTOS.some(p => p.url === imageUrl)) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <img 
                    src={imageUrl} 
                    alt="Uploaded preview" 
                    style={{ maxWidth: '100%', maxHeight: '90px', borderRadius: '8px', objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }} 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: '700' }}>
                    Custom Photo Loaded 📸 (Click to change)
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Camera size={26} color="var(--accent-color)" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-color)' }}>
                    Take Photo or Upload from Gallery
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Works on Mobile Camera & Gallery
                  </span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Or Quick Select Preset Mock Photo:
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {PRESET_PHOTOS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  style={{
                    border: imageUrl === preset.url ? '3px solid var(--accent-color)' : '1px solid var(--border-color)',
                    padding: 0,
                    height: '56px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transform: imageUrl === preset.url ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.15s'
                  }}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
            
            {/* Direct URL input fallback */}
            <input 
              type="text"
              className="form-control"
              placeholder="Or paste any custom image web link (URL)..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {/* Location picker mock */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="item-loc">Pickup Handoff Area</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                id="item-loc"
                className="form-control" 
                style={{ paddingLeft: '40px' }}
                placeholder="Enter neighborhood name, e.g. Sector 3, HSR Layout" 
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              📍 Map coordinates will be automatically pinned to this neighborhood area.
            </span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button 
              type="button" 
              onClick={onClose} 
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
              {isEditing ? 'Save Listing Changes' : 'List My Item Now!'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
