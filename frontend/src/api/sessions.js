import api from './client'

// Session API functions
export const sessionApi = {
  // Get all sessions (optionally filtered by status)
  list: (status, archived) =>
  api.get('/sessions', {
    params: {
      status,
      archived,
    },
  }),

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

  // Delete session
  delete: (id) => api.delete(`/sessions/${id}`),
}

// Beneficiary API functions
export const beneficiaryApi = {
  list: (category) => api.get('/beneficiaries', { params: { category } }),

  create: (data) =>
    api.post('/beneficiaries', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id, data) =>
    api.put(`/beneficiaries/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id) => api.delete(`/beneficiaries/${id}`),
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
