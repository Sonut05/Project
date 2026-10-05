/**
 * Date utility functions for RentIt
 * All operations on rental dates operate on YYYY-MM-DD strings to avoid timezone shift bugs.
 */

export function parseStrictDateOnly(dateStr, fieldName = 'Date') {
  if (typeof dateStr !== 'string') {
    throw new Error(`${fieldName} must be a string in YYYY-MM-DD format.`);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`${fieldName} must be in valid YYYY-MM-DD format.`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid ${fieldName} values in '${dateStr}'.`);
  }

  // Construct UTC date and verify that year, month, day did not roll over
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: '${dateStr}' does not exist on the calendar.`);
  }

  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    year,
    month,
    day,
    dateStr: normalized,
    utcDate
  };
}

export function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateStr, daysToAdd) {
  if (!dateStr) return getTodayString();
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateRentalDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const date1 = Date.UTC(y1, m1 - 1, d1);
  const date2 = Date.UTC(y2, m2 - 1, d2);
  const diffTime = date2 - date1;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  // If it's an ISO timestamp
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  // YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  return dateStr;
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDisplayDate(timestamp);
}

export function isDateRangeOverlapping(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  try {
    const sA = parseStrictDateOnly(startA).dateStr;
    const eA = parseStrictDateOnly(endA).dateStr;
    const sB = parseStrictDateOnly(startB).dateStr;
    const eB = parseStrictDateOnly(endB).dateStr;
    return sA <= eB && eA >= sB;
  } catch {
    return false;
  }
}
