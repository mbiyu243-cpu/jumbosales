import { useState } from 'react'
import { useCart } from '../context/CartContext'

function Checkout() {
  const { cart, cartTotal, clearCart, removeFromCart, updateQuantity } = useCart()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const formatKES = (amount) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)

  const handleMpesaCheckout = async () => {
    if (!phone) {
      alert('Please enter your M-Pesa phone number')
      return
    }

    setLoading(true)

    try {
      // M-Pesa backend endpoint will be connected here later
      console.log({
        phone,
        amount: cartTotal,
        items: cart,
      })

      alert('M-Pesa checkout request ready. Backend payment endpoint is next.')
      clearCart()
    } catch (err) {
      alert('Checkout failed')
    } finally {
      setLoading(false)
    }
  }

   if (cart.length === 0) {
  return (
    <div>
      <h2>Checkout</h2>
      <div className="alert alert-info">Your cart is empty.</div>
    </div>
  )
}
  return (
    <div>
      <h2>Checkout</h2>

      <div className="card mb-4">
        <div className="card-body">
          <h5>Order Summary</h5>

          {cart.map((item) => (
  <div key={item.ID} className="d-flex justify-content-between align-items-center border-bottom py-2">
    <div>
      <strong>{item.name}</strong>
      <p className="mb-1">{formatKES(item.suggested_price * item.quantity)}</p>
    </div>

    <div className="d-flex align-items-center gap-2">
      <input
        type="number"
        min="1"
        value={item.quantity}
        className="form-control"
        style={{ width: '80px' }}
        onChange={(e) => {
          const value = e.target.value

          if (value === '') {
            updateQuantity(item.ID, '')
            return
          }

          updateQuantity(item.ID, Number(value))
        }}
      />

      <button
        className="btn btn-sm btn-outline-danger"
        onClick={() => removeFromCart(item.ID)}
      >
        Remove
      </button>
    </div>
  </div>
))}

          <h4 className="mt-3">Total: {formatKES(cartTotal)}</h4>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5>M-Pesa Payment</h5>

          <label>Phone Number</label>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="e.g. 254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <button
            className="btn btn-success"
            onClick={handleMpesaCheckout}
            disabled={loading || cart.length === 0}
          >
            {loading ? 'Processing...' : `Pay ${formatKES(cartTotal)} with M-Pesa`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Checkout