// Utility functions in TypeScript
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return 'No time';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const getTimeAgo = (date: string | null | undefined): string => {
  if (!date) return 'Unknown time';
  const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
};

// YYYY-MM-DD in the device's local timezone. Don't use toISOString() for this:
// it converts to UTC, which is the previous day before 05:45 in Nepal.
const toLocalDateString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export {
  formatDate, formatDuration, formatTime, getTimeAgo, toLocalDateString
};
