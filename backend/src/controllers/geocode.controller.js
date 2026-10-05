import { config } from '../config/env.js';

// In-memory cache for recent geocoding queries
const geocodeCache = new Map();
const GEOCODER_TIMEOUT_MS = 6000; // 6-second server-side timeout to prevent hanging

export async function geocodeAddress(req, res, next) {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json([]);
    }

    const query = q.trim();
    const cacheKey = query.toLowerCase();

    if (geocodeCache.has(cacheKey)) {
      return res.json(geocodeCache.get(cacheKey));
    }

    const url = new URL(config.geocoderUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': config.geocoderUserAgent,
          Accept: 'application/json'
        }
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      const isTimeout = fetchErr.name === 'AbortError';
      console.error(`[Geocoder] Search failed (${isTimeout ? 'Timeout' : 'Network error'}): ${fetchErr.message}`);
      return res.json([]);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      console.error(`[Geocoder] Search returned status ${response.status}`);
      return res.json([]);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return res.json([]);
    }

    const results = data.map((item) => {
      const address = item.address || {};
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.suburb ||
        address.county ||
        address.state ||
        '';

      return {
        label: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city
      };
    });

    if (geocodeCache.size > 100) {
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey);
    }
    geocodeCache.set(cacheKey, results);

    res.json(results);
  } catch (err) {
    console.error('[Geocoder] Unexpected error in geocodeAddress:', err.message);
    res.json([]);
  }
}

export async function reverseGeocodeAddress(req, res, next) {
  try {
    const { lat, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: { code: 'INVALID_COORDINATES', message: 'Valid latitude and longitude are required.' } });
    }

    const cacheKey = `rev:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      return res.json(geocodeCache.get(cacheKey));
    }

    const reverseBase = config.geocoderUrl.replace(/\/search\/?$/, '/reverse');
    const url = new URL(reverseBase);
    url.searchParams.set('lat', latitude);
    url.searchParams.set('lon', longitude);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': config.geocoderUserAgent,
          Accept: 'application/json'
        }
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      const isTimeout = fetchErr.name === 'AbortError';
      console.error(`[Geocoder] Reverse geocode failed (${isTimeout ? 'Timeout' : 'Network error'}): ${fetchErr.message}`);
      return res.status(503).json({
        error: {
          code: 'GEOCODING_UNAVAILABLE',
          message: 'Location lookup is temporarily unavailable.'
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      console.error(`[Geocoder] Reverse geocode returned status ${response.status}`);
      return res.status(503).json({
        error: {
          code: 'GEOCODING_UNAVAILABLE',
          message: 'Location lookup is temporarily unavailable.'
        }
      });
    }

    const item = await response.json();
    const address = item.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.state ||
      '';

    const result = {
      label: item.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: city || '',
      latitude,
      longitude
    };

    if (geocodeCache.size > 100) {
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey);
    }
    geocodeCache.set(cacheKey, result);

    res.json(result);
  } catch (err) {
    console.error('[Geocoder] Unexpected error in reverseGeocodeAddress:', err.message);
    res.status(503).json({
      error: {
        code: 'GEOCODING_UNAVAILABLE',
        message: 'Location lookup is temporarily unavailable.'
      }
    });
  }
}
