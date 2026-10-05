import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveImageUrl } from '../utils/imageUrl.js';

// Fix Leaflet's default marker asset bundling issue safely
if (L.Icon?.Default?.prototype) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
  });
}

const getCategoryColor = (cat) => {
  switch (cat) {
    case 'Electronics':
      return '#3B82F6';
    case 'Power Tools':
    case 'Tools & Hardware':
      return '#F59E0B';
    case 'Sports & Fitness':
    case 'Outdoors':
      return '#10B981';
    case 'Photography':
      return '#8B5CF6';
    case 'Home & Garden':
      return '#06B6D4';
    default:
      return '#64748B';
  }
};

export default function LeafletMap({
  items = [],
  userLat = null,
  userLng = null,
  radiusKm = 25,
  onLocationChange,
  onViewItem
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const markersGroupRef = useRef(null);

  const hasUserCoords = typeof userLat === 'number' && typeof userLng === 'number' && !isNaN(userLat) && !isNaN(userLng);

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // If user coords provided, start there; else default to broad neutral view
      const initCenter = hasUserCoords ? [userLat, userLng] : [20.5937, 78.9629];
      const initZoom = hasUserCoords ? 13 : 5;

      const map = L.map(mapContainerRef.current).setView(initCenter, initZoom);
      mapInstanceRef.current = map;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);

      // Create user marker and radius circle only if valid coordinates exist
      if (hasUserCoords) {
        const userIcon = L.divIcon({
          className: 'user-location-pin',
          html: `
            <div style="
              background-color: #1D9E75;
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
                border: 1px solid #1D9E75;
                animation: ping 1.5s infinite;
                opacity: 0.5;
              "></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const userMarker = L.marker([userLat, userLng], {
          draggable: true,
          icon: userIcon
        }).addTo(map);
        userMarkerRef.current = userMarker;

        userMarker.on('dragend', (event) => {
          const marker = event.target;
          const pos = marker.getLatLng();
          if (onLocationChangeRef.current) {
            onLocationChangeRef.current(pos.lat, pos.lng);
          }
        });

        const userPopup = document.createElement('div');
        userPopup.style.fontSize = '13px';
        userPopup.style.textAlign = 'center';
        const strong = document.createElement('strong');
        strong.textContent = 'Selected Location';
        const br = document.createElement('br');
        const sub = document.createTextNode('Drag to explore other areas');
        userPopup.appendChild(strong);
        userPopup.appendChild(br);
        userPopup.appendChild(sub);
        userMarker.bindPopup(userPopup);

        const isAnywhere = radiusKm === null || radiusKm === undefined || radiusKm === 'anywhere' || radiusKm <= 0;
        const radiusCircle = L.circle([userLat, userLng], {
          color: '#1D9E75',
          fillColor: '#EBF7F2',
          fillOpacity: isAnywhere || radiusKm >= 100 ? 0 : 0.15,
          opacity: isAnywhere || radiusKm >= 100 ? 0 : 0.8,
          weight: isAnywhere || radiusKm >= 100 ? 0 : 1.5,
          radius: isAnywhere ? 1000 : radiusKm * 1000
        }).addTo(map);
        radiusCircleRef.current = radiusCircle;
      }
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user marker and radius circle dynamically
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (hasUserCoords) {
      const newPos = [userLat, userLng];

      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-location-pin',
          html: `
            <div style="
              background-color: #1D9E75;
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
                border: 1px solid #1D9E75;
                animation: ping 1.5s infinite;
                opacity: 0.5;
              "></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const userMarker = L.marker(newPos, {
          draggable: true,
          icon: userIcon
        }).addTo(map);
        userMarkerRef.current = userMarker;

        userMarker.on('dragend', (event) => {
          const marker = event.target;
          const pos = marker.getLatLng();
          if (onLocationChangeRef.current) {
            onLocationChangeRef.current(pos.lat, pos.lng);
          }
        });

        const userPopup = document.createElement('div');
        userPopup.style.fontSize = '13px';
        userPopup.style.textAlign = 'center';
        const strong = document.createElement('strong');
        strong.textContent = 'Selected Location';
        const br = document.createElement('br');
        const sub = document.createTextNode('Drag to explore other areas');
        userPopup.appendChild(strong);
        userPopup.appendChild(br);
        userPopup.appendChild(sub);
        userMarker.bindPopup(userPopup);
      } else {
        userMarkerRef.current.setLatLng(newPos);
      }

      const isAnywhere = radiusKm === null || radiusKm === undefined || radiusKm === 'anywhere' || radiusKm <= 0;
      if (!radiusCircleRef.current) {
        const radiusCircle = L.circle(newPos, {
          color: '#1D9E75',
          fillColor: '#EBF7F2',
          fillOpacity: isAnywhere || radiusKm >= 100 ? 0 : 0.15,
          opacity: isAnywhere || radiusKm >= 100 ? 0 : 0.8,
          weight: isAnywhere || radiusKm >= 100 ? 0 : 1.5,
          radius: isAnywhere ? 1000 : radiusKm * 1000
        }).addTo(map);
        radiusCircleRef.current = radiusCircle;
      } else {
        radiusCircleRef.current.setLatLng(newPos);
        if (!isAnywhere) {
          radiusCircleRef.current.setRadius(radiusKm * 1000);
        }
        radiusCircleRef.current.setStyle({
          fillOpacity: isAnywhere || radiusKm >= 100 ? 0 : 0.15,
          opacity: isAnywhere || radiusKm >= 100 ? 0 : 0.8,
          weight: isAnywhere || radiusKm >= 100 ? 0 : 1.5
        });
      }

      map.flyTo(newPos, Math.max(map.getZoom(), 12), {
        animate: true,
        duration: 0.8
      });
    } else {
      // Location was cleared; remove user pin and circle if they existed
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (radiusCircleRef.current) {
        map.removeLayer(radiusCircleRef.current);
        radiusCircleRef.current = null;
      }
    }
  }, [hasUserCoords, userLat, userLng, radiusKm]);

  // Update item markers on the map using safe DOM methods (Zero innerHTML XSS risk!)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    const validMarkers = [];

    items.forEach((item) => {
      const itemLat = typeof item.latitude === 'number' ? item.latitude : parseFloat(item.latitude);
      const itemLng = typeof item.longitude === 'number' ? item.longitude : parseFloat(item.longitude);

      if (isNaN(itemLat) || isNaN(itemLng)) return;

      const color = getCategoryColor(item.category);

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

      const marker = L.marker([itemLat, itemLng], { icon: pinIcon });

      // Build popup content securely with DOM nodes (Prevents XSS completely)
      const popupContainer = document.createElement('div');
      popupContainer.style.width = '200px';
      popupContainer.style.fontSize = '14px';

      if (item.images && item.images.length > 0) {
        const img = document.createElement('img');
        img.src = resolveImageUrl(item.images[0]);
        img.alt = item.name;
        img.style.width = '100%';
        img.style.height = '90px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        img.style.marginBottom = '8px';
        img.style.display = 'block';
        popupContainer.appendChild(img);
      }

      const title = document.createElement('div');
      title.style.fontWeight = '700';
      title.style.marginBottom = '2px';
      title.style.color = 'var(--text-primary)';
      title.style.textOverflow = 'ellipsis';
      title.style.overflow = 'hidden';
      title.style.whiteSpace = 'nowrap';
      title.textContent = item.name;
      popupContainer.appendChild(title);

      const locDiv = document.createElement('div');
      locDiv.style.fontSize = '11px';
      locDiv.style.color = 'var(--text-secondary)';
      locDiv.style.marginBottom = '6px';
      locDiv.style.textOverflow = 'ellipsis';
      locDiv.style.overflow = 'hidden';
      locDiv.style.whiteSpace = 'nowrap';
      locDiv.textContent = item.locationLabel || 'Nearby';
      popupContainer.appendChild(locDiv);

      const priceRow = document.createElement('div');
      priceRow.style.display = 'flex';
      priceRow.style.alignItems = 'center';
      priceRow.style.justifyContent = 'space-between';
      priceRow.style.margin = '4px 0 8px 0';

      const price = document.createElement('span');
      price.style.fontWeight = '700';
      price.style.color = 'var(--accent-color)';
      price.style.fontSize = '15px';
      price.textContent = `₹${item.dailyPrice}/day`;
      priceRow.appendChild(price);

      const rating = document.createElement('span');
      rating.style.fontSize = '12px';
      rating.style.color = 'var(--text-secondary)';
      rating.textContent = item.rating ? `★ ${item.rating}` : '★ New';
      priceRow.appendChild(rating);

      popupContainer.appendChild(priceRow);

      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View Details';
      viewBtn.style.backgroundColor = 'var(--accent-color)';
      viewBtn.style.color = 'white';
      viewBtn.style.border = 'none';
      viewBtn.style.borderRadius = '16px';
      viewBtn.style.fontWeight = '600';
      viewBtn.style.width = '100%';
      viewBtn.style.padding = '6px 12px';
      viewBtn.style.cursor = 'pointer';
      viewBtn.style.fontSize = '13px';
      viewBtn.style.minHeight = '32px';

      viewBtn.addEventListener('click', () => {
        if (onViewItem) onViewItem(item.id);
      });

      popupContainer.appendChild(viewBtn);

      marker.bindPopup(popupContainer);
      markersGroupRef.current.addLayer(marker);
      validMarkers.push(marker);
    });

    // Auto fit bounds if no user location is active and items exist
    if (!hasUserCoords && validMarkers.length > 0 && mapInstanceRef.current) {
      if (validMarkers.length === 1) {
        const latLng = validMarkers[0].getLatLng();
        mapInstanceRef.current.setView(latLng, 14);
      } else {
        const group = L.featureGroup(validMarkers);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15), { maxZoom: 15 });
      }
    }
  }, [items, hasUserCoords, onViewItem]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '160px' }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
