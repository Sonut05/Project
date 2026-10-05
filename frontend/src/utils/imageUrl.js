import { BASE_URL } from '../api/client.js';

export const ITEM_PLACEHOLDER = '/item-placeholder.svg';
export const AVATAR_PLACEHOLDER = '/avatar-placeholder.svg';

// Backward compatibility alias
export const FALLBACK_ITEM_IMAGE = ITEM_PLACEHOLDER;
export const FALLBACK_AVATAR_IMAGE = AVATAR_PLACEHOLDER;

/**
 * Resolves item/user image URLs to full URLs.
 * Works seamlessly whether images are absolute external URLs or relative /uploads paths
 * across different frontend/backend host origins.
 */
export function resolveImageUrl(url, fallback = ITEM_PLACEHOLDER) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    // If it's a local public asset like /item-placeholder.svg, don't prefix with backend BASE_URL
    if (trimmed.startsWith('/item-placeholder.svg') || trimmed.startsWith('/avatar-placeholder.svg') || trimmed.startsWith('/favicon.svg') || trimmed.startsWith('/icons.svg')) {
      return trimmed;
    }
    return `${BASE_URL}${trimmed}`;
  }
  return `${BASE_URL}/${trimmed}`;
}

export function resolveAvatarUrl(url, fallback = AVATAR_PLACEHOLDER) {
  return resolveImageUrl(url, fallback);
}
