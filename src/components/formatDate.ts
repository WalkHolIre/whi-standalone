/**
 * Date formatting utilities
 */

export function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '—';

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;

    if (isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

export function formatDateShort(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '—';

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;

    if (isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

export function formatDateISO(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '—';

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;

    if (isNaN(date.getTime())) {
      return '—';
    }

    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}
