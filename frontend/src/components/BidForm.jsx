import { useState, useEffect } from 'react'
import { formatKES } from '../utils/format'
import { initiateSTKPush, checkPaymentStatus } from '../api/mpesa'

/**
 * BidForm - Form for placing a bid on an auction session
 */
function BidForm({ currentPrice, sessionId, onSubmit, disabled }) {
  const [bidAmount, setBidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [transactionRef, setTransactionRef] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1)
  }

  if (cleaned.startsWith('7')) {
    cleaned = '254' + cleaned
  }

  return cleaned
}
  const [loading, setLoading] = useState(false)
  const [stkLoading, setStkLoading] = useState(false)
  const [stkStatus, setStkStatus] = useState(null) // 'pending', 'completed', 'failed'
  const [checkoutRequestId, setCheckoutRequestId] = useState(null)
  const [error, setError] = useState('')

  const minBid = currentPrice + 1 // Minimum increment of 1 KES


  // Poll for payment status when STK Push is pending
  useEffect(() => {
    let interval
    if (checkoutRequestId && stkStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const status = await checkPaymentStatus(checkoutRequestId)
          if (status.status === 'completed') {
            setStkStatus('completed')
            setTransactionRef(status.mpesa_receipt_number || checkoutRequestId)
            clearInterval(interval)
          } else if (status.status === 'failed') {
            setStkStatus('failed')
            setError(status.result_desc || 'Payment failed')
            clearInterval(interval)
          }
        } catch (err) {
          console.error('Status check failed:', err)
        }
      }, 3000) // Check every 3 seconds
    }
    return () => clearInterval(interval)
  }, [checkoutRequestId, stkStatus])

  const handleManualConfirm = async () => {
    if (!checkoutRequestId) return
    
    setStkLoading(true)
    try {
      const response = await fetch(`/api/mpesa/confirm/${checkoutRequestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        setStkStatus('completed')
        setTransactionRef(checkoutRequestId)
      } else {
        setError('Failed to confirm payment')
      }
    } catch (err) {
      setError('Error confirming payment: ' + err.message)
    } finally {
      setStkLoading(false)
    }
  }

  const handleSTKPush = async () => {
    setError('')
    setStkStatus(null)

    if (!phoneNumber) {
      setError('Please enter your M-Pesa phone number')
      return
    }

    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= currentPrice) {
      setError(`Bid must be higher than ${formatKES(currentPrice)}`)
      return
    }

    const increment = amount - currentPrice

    setStkLoading(true)
    try {
      const response = await initiateSTKPush(formatPhoneNumber(phoneNumber), increment, sessionId)
      setCheckoutRequestId(response.checkout_request_id)
      setStkStatus('pending')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate M-Pesa payment')
    } finally {
      setStkLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= currentPrice) {
      setError(`Bid must be higher than ${formatKES(currentPrice)}`)
      return
    }

    // For M-Pesa, require completed STK Push or manual transaction ref
    if (paymentMethod === 'mpesa' && !transactionRef && stkStatus !== 'completed') {
      setError('Please complete M-Pesa payment first or enter transaction code')
      return
    }

    setLoading(true)
   try {
  await onSubmit({
    bid_amount: amount,
    payment_method: paymentMethod,
    transaction_ref: transactionRef,
  })

  setBidAmount('')
  setTransactionRef('')
  setPhoneNumber('')
  setStkStatus(null)
  setCheckoutRequestId(null)
} catch (err) {
  console.error('Bid error:', err.response?.data || err.message)

  setError(
    err.response?.data?.error ||
    err.response?.data?.message ||
    'Failed to place bid'
  )
    } finally {
      setLoading(false)
    }
  }

  const increment = bidAmount ? parseFloat(bidAmount) - currentPrice : 0

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="close" onClick={() => setError('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      <div className="form-group">
        <label>Your Bid Amount (KES)</label>
        <input
          type="number"
          className="form-control form-control-lg"
          placeholder={`Minimum: ${formatKES(minBid)}`}
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          min={minBid}
          required
          disabled={disabled || loading}
        />
        {increment > 0 && (
          <small className="form-text text-success">
            You will pay: <strong>{formatKES(increment)}</strong> (the increment)
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Payment Method</label>
        <select
          className="form-control"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="mpesa">M-Pesa</option>
          <option value="bank">Bank Transfer</option>
          <option value="cash">Cash</option>
        </select>
      </div>

      {paymentMethod === 'mpesa' && (
        <>
          <div className="form-group">
            <label>M-Pesa Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g., 0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={disabled || loading || stkLoading || stkStatus === 'pending'}
            />
            <small className="form-text text-muted d-block mt-2 mb-2">
              Enter your phone number and click below to receive M-Pesa prompt
            </small>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleSTKPush}
              disabled={disabled || loading || stkLoading || !bidAmount || !phoneNumber || stkStatus === 'completed'}
            >
              {stkLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2"></span>
                  Sending...
                </>
              ) : stkStatus === 'pending' ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2"></span>
                  Waiting...
                </>
              ) : stkStatus === 'completed' ? (
                <>
                  <i className="bi bi-check-circle mr-2"></i>Paid
                </>
              ) : (
                'Send M-Pesa Request'
              )}
            </button>
          </div>

          {stkStatus === 'pending' && (
            <div>
              <div className="alert alert-info">
                <i className="bi bi-phone mr-2"></i>
                <strong>Check your phone!</strong> An M-Pesa prompt has been sent. Enter your PIN to complete payment.
              </div>
              <button
                type="button"
                className="btn btn-warning btn-sm btn-block mb-2"
                onClick={handleManualConfirm}
                disabled={stkLoading}
              >
                {stkLoading ? 'Confirming...' : 'Callback Not Working? Click to Confirm Manually'}
              </button>
            </div>
          )}

          {stkStatus === 'completed' && (
            <div className="alert alert-success">
              <i className="bi bi-check-circle mr-2"></i>
              <strong>Payment received!</strong> Transaction: {transactionRef}
            </div>
          )}

          <div className="form-group">
            <label>Or Enter M-Pesa Transaction Code (if paid separately)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., QKH7J5..."
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value.toUpperCase())}
              disabled={disabled || loading || stkStatus === 'completed'}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        className="btn btn-success btn-lg btn-block"
        disabled={disabled || loading || !bidAmount}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm mr-2"></span>
            Placing Bid...
          </>
        ) : (
          <>
            <i className="bi bi-lightning"></i> Place Bid
          </>
        )}
      </button>
    </form>
  )
}

export default BidForm
