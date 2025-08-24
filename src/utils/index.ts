import { ClipboardEntry } from '../types';

// Text cleanup utility function
export function cleanupText(text: string): string {
  if (!text) return "";
  
  return text
    // Remove excessive whitespace and normalize line breaks
    .replace(/\r\n/g, '\n')  // Convert Windows line endings
    .replace(/\r/g, '\n')    // Convert Mac line endings
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple line breaks with double
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .replace(/\n{3,}/g, '\n\n') // Limit to max 2 consecutive line breaks
    .trim(); // Trim overall
}

// Format timestamp for display
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get content type icon
export function getContentTypeIcon(type: string): string {
  switch (type) {
    case 'url': return '🔗';
    case 'email': return '📧';
    case 'phone': return '📞';
    default: return '📄';
  }
}

// Common styles for components
export const commonStyles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '"-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"',
    lineHeight: '1.6',
    color: '#2d3748',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  button: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    transition: 'all 0.2s ease'
  },
  gradientText: {
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  }
};

// Button hover effects
export const addHoverEffect = (element: HTMLElement, direction: 'up' | 'down' = 'up') => {
  const translateY = direction === 'up' ? '-2px' : '2px';
  element.style.transform = `translateY(${translateY})`;
};

export const removeHoverEffect = (element: HTMLElement) => {
  element.style.transform = 'translateY(0)';
};