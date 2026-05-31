// Mock Database engine for RentIt P2P Daily Item Rental

const DB_KEY = 'rentit_p2p_db_v6';

const INITIAL_DB = {
  currentUserId: null, // Initially null to enforce auth gate
  users: {},
  items: [],
  requests: [],
  activities: [],
  reviews: []
};

// Haversine formula to compute distance in km between two geo coordinates
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1)); // Rounded to 1 decimal place
}

// Check date ranges for overlap
export function isDateRangeOverlapping(start1, end1, start2, end2) {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  return s1 <= e2 && s2 <= e1;
}

// Convert address/city keyword checks into mock latitude/longitude coordinates
export function getCoordinatesForAddress(address = '', city = '') {
  const text = `${address} ${city}`.toLowerCase();
  
  // Specific Bangalore areas
  if (text.includes('hsr layout') || text.includes('hsr')) return { lat: 12.9100, lng: 77.6400 };
  if (text.includes('jayanagar')) return { lat: 12.9300, lng: 77.5800 };
  if (text.includes('indiranagar')) return { lat: 12.9780, lng: 77.6400 };
  if (text.includes('koramangala')) return { lat: 12.9350, lng: 77.6250 };
  if (text.includes('whitefield')) return { lat: 12.9698, lng: 77.7500 };
  if (text.includes('hebbal')) return { lat: 13.0350, lng: 77.5970 };
  if (text.includes('rajajinagar')) return { lat: 12.9900, lng: 77.5500 };
  if (text.includes('malleshwaram')) return { lat: 13.0030, lng: 77.5700 };
  if (text.includes('marathahalli')) return { lat: 12.9562, lng: 77.7011 };
  if (text.includes('electronic city')) return { lat: 12.8452, lng: 77.6760 };

  // Specific Vadodara landmarks/neighborhoods
  if (text.includes('parul university') || text.includes('parul') || text.includes('waghodia')) return { lat: 22.3072, lng: 73.1812 };
  if (text.includes('alkapuri')) return { lat: 22.3129, lng: 73.1674 };
  if (text.includes('gotri')) return { lat: 22.3181, lng: 73.1363 };
  if (text.includes('sayajigunj') || text.includes('fatehgunj')) return { lat: 22.3100, lng: 73.1800 };
  if (text.includes('manjalpur') || text.includes('akota')) return { lat: 22.2900, lng: 73.1700 };
  if (text.includes('karelibaug')) return { lat: 22.3250, lng: 73.1950 };

  // Cities
  if (text.includes('mumbai') || text.includes('bombay')) return { lat: 19.0760, lng: 72.8777 };
  if (text.includes('delhi') || text.includes('new delhi') || text.includes('ncr')) return { lat: 28.6139, lng: 77.2090 };
  if (text.includes('noida')) return { lat: 28.5355, lng: 77.3910 };
  if (text.includes('gurgaon') || text.includes('gurugram')) return { lat: 28.4595, lng: 77.0266 };
  if (text.includes('hyderabad') || text.includes('secunderabad')) return { lat: 17.3850, lng: 78.4867 };
  if (text.includes('pune')) return { lat: 18.5204, lng: 73.8567 };
  if (text.includes('chennai') || text.includes('madras')) return { lat: 13.0827, lng: 80.2707 };
  if (text.includes('kolkata') || text.includes('calcutta')) return { lat: 22.5726, lng: 88.3639 };
  if (text.includes('goa') || text.includes('panaji')) return { lat: 15.2993, lng: 74.1240 };
  if (text.includes('ahmedabad')) return { lat: 23.0225, lng: 72.5714 };
  if (text.includes('jaipur')) return { lat: 26.9124, lng: 75.7873 };
  if (text.includes('vadodara') || text.includes('baroda')) return { lat: 22.3072, lng: 73.1812 };

  // General Bangalore regions
  if (text.includes('bangalore east') || text.includes('bengaluru east')) return { lat: 12.9740, lng: 77.6010 };
  if (text.includes('bangalore west') || text.includes('bengaluru west')) return { lat: 12.9900, lng: 77.5500 };
  if (text.includes('bangalore north') || text.includes('bengaluru north')) return { lat: 13.0350, lng: 77.5970 };
  if (text.includes('bangalore south') || text.includes('bengaluru south')) return { lat: 12.9300, lng: 77.5800 };

  // Fallback to central Bangalore
  return { lat: 12.9716, lng: 77.5946 };
}

// Retrieve DB with full fallback
export function getDb() {
  const local = localStorage.getItem(DB_KEY);
  if (!local) {
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DB));
    return INITIAL_DB;
  }
  try {
    return JSON.parse(local);
  } catch (e) {
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DB));
    return INITIAL_DB;
  }
}

// Save DB state
export function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  // Dispatch a custom event so React components can trigger reactivity
  window.dispatchEvent(new Event('rentit_db_update'));
}

// DB Operations
export const dbOps = {
  // Authentication Actions
  login: (email, password) => {
    const db = getDb();
    const user = Object.values(db.users).find(u => u.email?.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password');
    db.currentUserId = user.id;
    saveDb(db);
    return user;
  },

  register: (name, email, password, phone) => {
    const db = getDb();
    const exists = Object.values(db.users).some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error('Email is already registered');
    
    const newId = `user-${Date.now()}`;
    db.users[newId] = {
      id: newId,
      name,
      email,
      password, // Save password so user can log in again
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      city: '',
      memberSince: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      rating: 5.0,
      reviewCount: 0,
      verified: false,
      totalCompletedRentals: 0,
      phone: phone || '',
      address: '',
      hasCompletedOnboarding: false,
      loginCount: 1,
      onboardingUseMode: 'both'
    };
    db.currentUserId = newId;
    saveDb(db);
    return db.users[newId];
  },

  logout: () => {
    const db = getDb();
    db.currentUserId = null;
    saveDb(db);
  },

  loginAs: (userId) => {
    const db = getDb();
    const user = db.users[userId];
    if (!user) throw new Error('User not found');
    db.currentUserId = userId;
    saveDb(db);
    return user;
  },

  // Onboarding
  completeOnboarding: (userData) => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    const coords = getCoordinatesForAddress(userData.address, userData.city);
    let lat = userData.lat !== undefined ? userData.lat : coords.lat;
    let lng = userData.lng !== undefined ? userData.lng : coords.lng;

    // Fallback if coordinates are standard Bangalore central but the city is explicitly non-Bangalore
    if (lat === 12.9716 && lng === 77.5946 && userData.city && !userData.city.toLowerCase().includes('bangalore') && !userData.city.toLowerCase().includes('bengaluru')) {
      if (coords.lat !== 12.9716 || coords.lng !== 77.5946) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    db.users[activeUserId] = {
      ...db.users[activeUserId],
      ...userData,
      lat,
      lng,
      hasCompletedOnboarding: true,
      loginCount: 1
    };
    saveDb(db);
    return db.users[activeUserId];
  },

  incrementLogin: () => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    if (db.users[activeUserId]) {
      db.users[activeUserId].loginCount = (db.users[activeUserId].loginCount || 0) + 1;
      saveDb(db);
    }
  },

  // Edit Profile
  updateProfile: (profileData) => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    const currentProfile = db.users[activeUserId] || {};
    const updatedAddress = profileData.address !== undefined ? profileData.address : currentProfile.address;
    const updatedCity = profileData.city !== undefined ? profileData.city : currentProfile.city;
    const coords = getCoordinatesForAddress(updatedAddress, updatedCity);
    let lat = profileData.lat !== undefined ? profileData.lat : coords.lat;
    let lng = profileData.lng !== undefined ? profileData.lng : coords.lng;

    // Fallback if coordinates are standard Bangalore central but the city is explicitly non-Bangalore
    if (lat === 12.9716 && lng === 77.5946 && updatedCity && !updatedCity.toLowerCase().includes('bangalore') && !updatedCity.toLowerCase().includes('bengaluru')) {
      if (coords.lat !== 12.9716 || coords.lng !== 77.5946) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    db.users[activeUserId] = {
      ...currentProfile,
      ...profileData,
      lat,
      lng
    };
    saveDb(db);
    return db.users[activeUserId];
  },

  // Get single user details (with rating average & listings)
  getUserProfile: (userId) => {
    const db = getDb();
    const user = db.users[userId];
    if (!user) return null;
    
    // Get their listings
    const listings = db.items.filter(item => item.lenderId === userId);
    // Get their reviews
    const reviews = db.reviews.filter(rev => rev.targetType === 'user' && rev.targetId === userId);
    
    return {
      ...user,
      listings,
      reviews
    };
  },

  // Items
  addItem: (itemData) => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    const activeUser = db.users[activeUserId] || {};
    const fallbackLat = activeUser.lat !== undefined ? activeUser.lat : 12.9716;
    const fallbackLng = activeUser.lng !== undefined ? activeUser.lng : 77.5946;

    // Geocode item location or fallback to user coordinates
    const coords = getCoordinatesForAddress(itemData.location || '');
    let baseLat = coords.lat;
    let baseLng = coords.lng;
    if (coords.lat === 12.9716 && coords.lng === 77.5946) {
      baseLat = fallbackLat;
      baseLng = fallbackLng;
    }

    // Apply a slight neighborhood random offset so items listed in the same area don't overlap perfectly
    const randomOffsetLat = (Math.random() - 0.5) * 0.01;
    const randomOffsetLng = (Math.random() - 0.5) * 0.01;

    const newItem = {
      id: `item-${Date.now()}`,
      lenderId: activeUserId,
      images: itemData.images && itemData.images.length > 0 ? itemData.images : ['https://images.unsplash.com/photo-1531685250784-7569952593d2?auto=format&fit=crop&q=80&w=400'],
      reviews: [],
      availability: 'Available',
      ...itemData,
      lat: baseLat + randomOffsetLat,
      lng: baseLng + randomOffsetLng
    };
    db.items.unshift(newItem);
    
    // Add dashboard activity
    db.activities.unshift({
      id: `act-${Date.now()}`,
      userId: activeUserId,
      message: `You successfully listed your new item "${newItem.name}"`,
      date: 'Just now',
      timestamp: Date.now(),
      type: 'success'
    });
    
    saveDb(db);
    return newItem;
  },

  editItem: (itemId, updatedData) => {
    const db = getDb();
    const idx = db.items.findIndex(item => item.id === itemId);
    if (idx !== -1) {
      let coordsUpdate = {};
      if (updatedData.location !== undefined && updatedData.location !== db.items[idx].location) {
        const activeUserId = db.currentUserId || 'user-self';
        const activeUser = db.users[activeUserId] || {};
        const fallbackLat = activeUser.lat !== undefined ? activeUser.lat : 12.9716;
        const fallbackLng = activeUser.lng !== undefined ? activeUser.lng : 77.5946;

        const coords = getCoordinatesForAddress(updatedData.location);
        let baseLat = coords.lat;
        let baseLng = coords.lng;
        if (coords.lat === 12.9716 && coords.lng === 77.5946) {
          baseLat = fallbackLat;
          baseLng = fallbackLng;
        }

        const randomOffsetLat = (Math.random() - 0.5) * 0.01;
        const randomOffsetLng = (Math.random() - 0.5) * 0.01;

        coordsUpdate = {
          lat: baseLat + randomOffsetLat,
          lng: baseLng + randomOffsetLng
        };
      }

      db.items[idx] = {
        ...db.items[idx],
        ...updatedData,
        ...coordsUpdate
      };
      saveDb(db);
      return db.items[idx];
    }
    return null;
  },

  removeItem: (itemId) => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    const item = db.items.find(i => i.id === itemId);
    const itemName = item ? item.name : 'Item';

    db.items = db.items.filter(item => item.id !== itemId);
    // Also remove requests related to this item
    db.requests = db.requests.filter(req => req.itemId !== itemId);

    // Add dashboard activity for item deletion
    db.activities.unshift({
      id: `act-${Date.now()}`,
      userId: activeUserId,
      message: `You successfully deleted your listed item "${itemName}"`,
      date: 'Just now',
      timestamp: Date.now(),
      type: 'info'
    });

    saveDb(db);
  },

  // Requests API
  sendBorrowRequest: (requestData) => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    const newRequest = {
      id: `req-${Date.now()}`,
      borrowerId: activeUserId,
      status: 'Pending',
      ...requestData
    };
    db.requests.push(newRequest);

    // Get item detail to append to activities
    const item = db.items.find(i => i.id === requestData.itemId);
    const lenderName = db.users[requestData.lenderId]?.name || 'Lender';
    const borrowerName = db.users[activeUserId]?.name || 'Borrower';
    
    // Activity for Borrower
    db.activities.unshift({
      id: `act-${Date.now()}-borrower`,
      userId: activeUserId,
      message: `You sent a borrow request for "${item ? item.name : 'Item'}" to ${lenderName}`,
      date: 'Just now',
      timestamp: Date.now(),
      type: 'info'
    });

    // Activity for Lender
    db.activities.unshift({
      id: `act-${Date.now()}-lender`,
      userId: requestData.lenderId,
      message: `${borrowerName} sent a borrow request for your item "${item ? item.name : 'Item'}"`,
      date: 'Just now',
      timestamp: Date.now(),
      type: 'info'
    });

    saveDb(db);
    return newRequest;
  },

  cancelRequest: (requestId) => {
    const db = getDb();
    const activeUserId = db.currentUserId || 'user-self';
    const request = db.requests.find(req => req.id === requestId);
    const item = request ? db.items.find(i => i.id === request.itemId) : null;
    const itemName = item ? item.name : 'Item';

    db.requests = db.requests.filter(req => req.id !== requestId);

    // Add dashboard activity for request cancellation
    db.activities.unshift({
      id: `act-${Date.now()}`,
      userId: activeUserId,
      message: `You cancelled your borrow request for "${itemName}"`,
      date: 'Just now',
      timestamp: Date.now(),
      type: 'info'
    });

    saveDb(db);
  },

  acceptRequest: (requestId) => {
    const db = getDb();
    const reqIdx = db.requests.findIndex(req => req.id === requestId);
    if (reqIdx !== -1) {
      const request = db.requests[reqIdx];
      request.status = 'Accepted';
      
      // Update item status to Rented Out
      const itemIdx = db.items.findIndex(item => item.id === request.itemId);
      if (itemIdx !== -1) {
        db.items[itemIdx].availability = 'Rented Out';
      }

      // Add to activity logs
      const borrowerName = db.users[request.borrowerId]?.name || 'Borrower';
      const lenderName = db.users[request.lenderId]?.name || 'Lender';
      const item = db.items.find(i => i.id === request.itemId);
      
      // Activity for Lender
      db.activities.unshift({
        id: `act-${Date.now()}-lender`,
        userId: request.lenderId,
        message: `You accepted ${borrowerName}'s request for "${item ? item.name : 'your item'}"`,
        date: 'Just now',
        timestamp: Date.now(),
        type: 'success'
      });

      // Activity for Borrower
      db.activities.unshift({
        id: `act-${Date.now()}-borrower`,
        userId: request.borrowerId,
        message: `${lenderName} accepted your request for "${item ? item.name : 'Item'}"`,
        date: 'Just now',
        timestamp: Date.now(),
        type: 'success'
      });

      saveDb(db);
      return request;
    }
    return null;
  },

  rejectRequest: (requestId) => {
    const db = getDb();
    const reqIdx = db.requests.findIndex(req => req.id === requestId);
    if (reqIdx !== -1) {
      const request = db.requests[reqIdx];
      request.status = 'Rejected';

      const borrowerName = db.users[request.borrowerId]?.name || 'Borrower';
      const lenderName = db.users[request.lenderId]?.name || 'Lender';
      const item = db.items.find(i => i.id === request.itemId);

      // Activity for Lender
      db.activities.unshift({
        id: `act-${Date.now()}-lender`,
        userId: request.lenderId,
        message: `You rejected ${borrowerName}'s request for "${item ? item.name : 'your item'}"`,
        date: 'Just now',
        timestamp: Date.now(),
        type: 'info'
      });

      // Activity for Borrower
      db.activities.unshift({
        id: `act-${Date.now()}-borrower`,
        userId: request.borrowerId,
        message: `${lenderName} rejected your request for "${item ? item.name : 'Item'}"`,
        date: 'Just now',
        timestamp: Date.now(),
        type: 'info'
      });

      saveDb(db);
      return db.requests[reqIdx];
    }
    return null;
  },

  markAsReturned: (requestId) => {
    const db = getDb();
    const reqIdx = db.requests.findIndex(req => req.id === requestId);
    if (reqIdx !== -1) {
      const request = db.requests[reqIdx];
      request.status = 'Completed';

      // Re-enable item availability
      const itemIdx = db.items.findIndex(item => item.id === request.itemId);
      if (itemIdx !== -1) {
        db.items[itemIdx].availability = 'Available';
      }

      // Update stat tracking for both users
      if (db.users[request.lenderId]) {
        db.users[request.lenderId].totalCompletedRentals = (db.users[request.lenderId].totalCompletedRentals || 0) + 1;
      }
      if (db.users[request.borrowerId]) {
        db.users[request.borrowerId].totalCompletedRentals = (db.users[request.borrowerId].totalCompletedRentals || 0) + 1;
      }

      // Add to activity feed
      const item = db.items.find(i => i.id === request.itemId);
      const borrowerName = db.users[request.borrowerId]?.name || 'Borrower';
      const lenderName = db.users[request.lenderId]?.name || 'Lender';

      // Activity for Lender
      db.activities.unshift({
        id: `act-${Date.now()}-lender`,
        userId: request.lenderId,
        message: `Your item "${item?.name || 'Item'}" has been returned by ${borrowerName}`,
        date: 'Just now',
        timestamp: Date.now(),
        type: 'success'
      });

      // Activity for Borrower
      db.activities.unshift({
        id: `act-${Date.now()}-borrower`,
        userId: request.borrowerId,
        message: `You successfully returned "${item?.name || 'Item'}" to ${lenderName}`,
        date: 'Just now',
        timestamp: Date.now(),
        type: 'success'
      });

      saveDb(db);
      return request;
    }
    return null;
  },

  // Submit dynamic review
  addReview: (reviewData) => {
    const db = getDb();
    const newReview = {
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...reviewData
    };
    db.reviews.push(newReview);

    // Update target rating averages
    if (reviewData.targetType === 'user') {
      const userReviews = db.reviews.filter(rev => rev.targetType === 'user' && rev.targetId === reviewData.targetId);
      const avg = userReviews.reduce((sum, rev) => sum + rev.rating, 0) / userReviews.length;
      if (db.users[reviewData.targetId]) {
        db.users[reviewData.targetId].rating = parseFloat(avg.toFixed(1));
        db.users[reviewData.targetId].reviewCount = userReviews.length;
      }
    } else if (reviewData.targetType === 'item') {
      const itemIdx = db.items.findIndex(i => i.id === reviewData.targetId);
      if (itemIdx !== -1) {
        if (!db.items[itemIdx].reviews) db.items[itemIdx].reviews = [];
        db.items[itemIdx].reviews.unshift({
          reviewerName: reviewData.authorName,
          rating: reviewData.rating,
          comment: reviewData.comment,
          date: newReview.date
        });
      }
    }

    saveDb(db);
    return newReview;
  },

  removeActivity: (activityId) => {
    const db = getDb();
    db.activities = db.activities.filter(act => act.id !== activityId);
    saveDb(db);
  }
};
