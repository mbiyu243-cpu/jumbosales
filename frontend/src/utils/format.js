/**
 * Format amount in Kenyan Shillings
 * @param {number} amount
 * @returns {string} Formatted currency string
 */
export function formatKES(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param {string|Date} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return past.toLocaleDateString('en-KE')
}

/**
 * Get status badge class based on session status
 * @param {string} status
 * @returns {string} CSS class
 */
export function getStatusClass(status) {
  const classes = {
    open: 'badge-success',
    closing: 'badge-warning',
    closed: 'badge-info',
    complete: 'badge-secondary',
  }
  return classes[status] || 'badge-secondary'
}
