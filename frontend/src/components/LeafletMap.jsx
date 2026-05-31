import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker asset bundling issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Category to marker color helper (to color code markers by category)
const getCategoryColor = (cat) => {
  switch (cat) {
    case 'Electronics': return '#3B82F6'; // blue
    case 'Tools & Hardware': return '#F59E0B'; // orange
    case 'Sports & Fitness': return '#10B981'; // green
    case 'Kitchen & Appliances': return '#EF4444'; // red
    case 'Furniture & Home': return '#8B5CF6'; // purple
    case 'Vehicles': return '#06B6D4'; // cyan
    case 'Books & Education': return '#EC4899'; // pink
    default: return '#64748B'; // gray
  }
};

export default function LeafletMap({ 
  items, 
  userLat, 
  userLng, 
  radiusKm, 
  onLocationChange, 
  onViewItem 
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarkerInstance = useRef(null);
  const radiusCircleInstance = useRef(null);
  const markersGroupInstance = useRef(null);

  useEffect(() => {
    // Initialize map
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView([userLat, userLng], 14);

      // Warm retro styling using custom tile provider (CartoDB Positron - light, friendly, readable)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstance.current);

      // Create a layer group for item markers
      markersGroupInstance.current = L.layerGroup().addTo(mapInstance.current);

      // User's location marker (Draggable pin)
      const userIcon = L.divIcon({
        className: 'user-location-pin',
        html: `
          <div style="
            background-color: var(--accent-color);
            border: 3px solid white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: -6px;
              left: -6px;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              border: 1px solid var(--accent-color);
              animation: ping 1.5s infinite;
              opacity: 0.5;
            "></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      userMarkerInstance.current = L.marker([userLat, userLng], { 
        draggable: true,
        icon: userIcon
      }).addTo(mapInstance.current);

      // Bind drag event to update latitude and longitude
      userMarkerInstance.current.on('dragend', (event) => {
        const marker = event.target;
        const position = marker.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      // Bind user marker popup
      userMarkerInstance.current.bindPopup(`
        <div style="font-family: var(--font-body); font-size: 13px; text-align: center;">
          <strong>Your Location</strong><br>
          Drag me to search other areas! 📍
        </div>
      `);

      // Selected Search Radius Circle visual (Hidden if Anywhere / 100km)
      radiusCircleInstance.current = L.circle([userLat, userLng], {
        color: 'var(--accent-color)',
        fillColor: 'var(--accent-color-light)',
        fillOpacity: radiusKm >= 100 ? 0 : 0.15,
        opacity: radiusKm >= 100 ? 0 : 1.0,
        weight: radiusKm >= 100 ? 0 : 1.5,
        radius: radiusKm * 1000 // Convert km to meters
      }).addTo(mapInstance.current);
    }

    // Cleanup function
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map center when user coordinates change
  useEffect(() => {
    if (mapInstance.current && userMarkerInstance.current && radiusCircleInstance.current) {
      const newPos = [userLat, userLng];
      userMarkerInstance.current.setLatLng(newPos);
      radiusCircleInstance.current.setLatLng(newPos);
      radiusCircleInstance.current.setRadius(radiusKm * 1000);
      radiusCircleInstance.current.setStyle({
        color: 'var(--accent-color)',
        fillColor: 'var(--accent-color-light)',
        fillOpacity: radiusKm >= 100 ? 0 : 0.15,
        opacity: radiusKm >= 100 ? 0 : 1.0,
        weight: radiusKm >= 100 ? 0 : 1.5
      });
      
      // Smoothly slide and pan the map to the new location with flyTo animation
      mapInstance.current.flyTo(newPos, mapInstance.current.getZoom(), {
        animate: true,
        duration: 1.2, // 1.2 seconds duration for smooth glide
        easeLinearity: 0.25
      });
    }
  }, [userLat, userLng, radiusKm]);

  // Update item markers on the map dynamically
  useEffect(() => {
    if (mapInstance.current && markersGroupInstance.current) {
      // Clear existing markers
      markersGroupInstance.current.clearLayers();

      // Add new markers for search items
      items.forEach((item) => {
        const color = getCategoryColor(item.category);
        
        // Custom color coded SVG Pin for Leaflet
        const pinIcon = L.divIcon({
          className: 'item-pin-marker',
          html: `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.5"/>
              <circle cx="12" cy="9" r="3.5" fill="#FFFFFF"/>
            </svg>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -30]
        });

        const marker = L.marker([item.lat, item.lng], { icon: pinIcon });

        // Add beautiful responsive item cards in Leaflet popups
        const popupDiv = document.createElement('div');
        popupDiv.className = 'custom-map-popup';
        popupDiv.style.width = '200px';
        popupDiv.style.fontFamily = 'var(--font-body)';
        popupDiv.style.fontSize = '14px';

        popupDiv.innerHTML = `
          <img src="${item.images[0]}" alt="${item.name}" class="popup-image" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block;" />
          <div style="font-weight: bold; margin-bottom: 2px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${item.name}
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-color); flex-shrink: 0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 180px;">${item.location || 'Not Specified'}</span>
          </div>
          <span style="font-size: 11px; background-color: var(--bg-tertiary); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
            ${item.category}
          </span>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; margin-bottom: 8px;">
            <span style="font-weight: 700; color: var(--accent-color); font-size: 15px;">₹${item.dailyPrice}<span style="font-weight: normal; font-size: 11px; color: var(--text-secondary);">/day</span></span>
            <span style="font-size: 12px; color: var(--text-secondary);">★ ${item.reviews.length > 0 ? (item.reviews.reduce((s, r) => s + r.rating, 0)/item.reviews.length).toFixed(1) : 'New'}</span>
          </div>
          <button id="popup-btn-${item.id}" style="
            background-color: var(--accent-color);
            color: white;
            border: none;
            border-radius: 16px;
            font-weight: 600;
            width: 100%;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
            min-height: 32px;
            text-align: center;
          ">View & Borrow</button>
        `;

        marker.bindPopup(popupDiv);

        // Bind event to view item details on popup button click
        marker.on('popupopen', () => {
          const btn = document.getElementById(`popup-btn-${item.id}`);
          if (btn) {
            btn.addEventListener('click', () => {
              onViewItem(item.id);
            });
          }
        });

        markersGroupInstance.current.addLayer(marker);
      });
    }
  }, [items]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '320px' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
