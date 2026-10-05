import { ValidationError } from './errors.js';

/**
 * Strict date-only parser and validator for YYYY-MM-DD rental dates.
 * Rejects invalid calendar dates like 2026-02-31, 2026-04-31, etc.
 * Uses UTC components to prevent any timezone shifting.
 */
export function parseStrictDateOnly(dateStr, fieldName = 'Date') {
  if (typeof dateStr !== 'string') {
    throw new ValidationError(`${fieldName} must be a string in YYYY-MM-DD format.`);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new ValidationError(`${fieldName} must be in valid YYYY-MM-DD format.`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ValidationError(`Invalid ${fieldName} values in '${dateStr}'.`);
  }

  // Construct UTC date and verify that year, month, day did not roll over
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new ValidationError(`Invalid calendar date: '${dateStr}' does not exist on the calendar.`);
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

/**
 * Returns current date as YYYY-MM-DD in local time
 */
export function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates rental duration inclusively in whole days
 */
export function calculateRentalDays(startStr, endStr) {
  const start = parseStrictDateOnly(startStr, 'Start date');
  const end = parseStrictDateOnly(endStr, 'End date');

  if (end.dateStr < start.dateStr) {
    throw new ValidationError('End date cannot be earlier than start date.');
  }

  const diffMs = end.utcDate.getTime() - start.utcDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Checks if two date ranges [startA, endA] and [startB, endB] overlap inclusively
 */
export function isDateRangeOverlapping(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

/**
 * Adds whole days to a YYYY-MM-DD string
 */
export function addDaysToDateString(dateStr, days) {
  const parsed = parseStrictDateOnly(dateStr);
  const result = new Date(parsed.utcDate);
  result.setUTCDate(result.getUTCDate() + days);
  const y = result.getUTCFullYear();
  const m = String(result.getUTCMonth() + 1).padStart(2, '0');
  const d = String(result.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a YYYY-MM-DD string or ISO timestamp for display safely without timezone offset
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
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
