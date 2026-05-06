import api from './client'

/**
 * Initiate M-Pesa STK Push to customer's phone
 * @param {string} phoneNumber - Customer's phone number (e.g., 0712345678)
 * @param {number} amount - Amount to charge
 * @param {number} sessionId - Auction session ID
 * @returns {Promise} API response with checkout_request_id
 */
export const initiateSTKPush = async (phoneNumber, amount, sessionId) => {
  const response = await api.post('/mpesa/stkpush', {
    phone: phoneNumber,
    amount: amount,
    session_id: sessionId,
  })
  return response.data
}

/**
 * Check M-Pesa payment status
 * @param {string} checkoutRequestId - Checkout request ID from STK Push
 * @returns {Promise} Payment status
 */
export const checkPaymentStatus = async (checkoutRequestId) => {
  const response = await api.get(`/mpesa/status/${checkoutRequestId}`)
  return response.data
}
