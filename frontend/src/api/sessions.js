import api from './client'

// Session API functions
export const sessionApi = {
  // Get all sessions (optionally filtered by status)
  list: (status) => api.get('/sessions', { params: { status } }),

  // Get single session with bids
  get: (id) => api.get(`/sessions/${id}`),

  // Create new session (cashier only)
  create: (data) => api.post('/sessions', data),

  // Close session / end bidding (cashier only)
  close: (id) => api.post(`/sessions/${id}/close`),

  // Get bids for a session
  getBids: (id) => api.get(`/sessions/${id}/bids`),

  // Place a bid
  placeBid: (id, data) => api.post(`/sessions/${id}/bids`, data),

  // Donate item to beneficiary (winner only)
  donate: (id, data) => api.post(`/sessions/${id}/donate`, data),
}

// Beneficiary API functions
export const beneficiaryApi = {
  // List all beneficiaries
  list: (category) => api.get('/beneficiaries', { params: { category } }),

  // Create new beneficiary (cashier only)
  create: (data) => api.post('/beneficiaries', data),
}

// Product API functions
export const productApi = {
  // List all products
  list: (category) => api.get('/products', { params: { category } }),

  // Get single product
  get: (id) => api.get(`/products/${id}`),

  // Create new product (cashier only)
  create: (data) => api.post('/products', data),

  // Update product (cashier only)
  update: (id, data) => api.put(`/products/${id}`, data),

  // Delete product (cashier only)
  delete: (id) => api.delete(`/products/${id}`),
}
