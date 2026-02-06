import { useState } from 'react'
import { formatKES } from '../utils/format'

/**
 * BidForm - Form for placing a bid on an auction session
 */
function BidForm({ currentPrice, onSubmit, disabled }) {
  const [bidAmount, setBidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [transactionRef, setTransactionRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const minBid = currentPrice + 1 // Minimum increment of 1 KES

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= currentPrice) {
      setError(`Bid must be higher than ${formatKES(currentPrice)}`)
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        bid_amount: amount,
        payment_method: paymentMethod,
        transaction_ref: transactionRef,
      })
      // Clear form on success
      setBidAmount('')
      setTransactionRef('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place bid')
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
        <div className="form-group">
          <label>M-Pesa Transaction Code (Optional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., QKH7J5..."
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value.toUpperCase())}
            disabled={disabled || loading}
          />
        </div>
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
