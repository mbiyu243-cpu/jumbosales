import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart()

  const formatKES = (amount) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)

  if (cart.length === 0) {
    return (
      <div>
        <h2>🛒 Cart</h2>
        <div className="alert alert-info">Your cart is empty.</div>
        <Link to="/products" className="btn btn-primary">Go to Products</Link>
      </div>
    )
  }

  return (
    <div>
      <h2>🛒 Cart</h2>

      {cart.map((item) => (
        <div key={item.ID} className="card mb-3">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <h5>{item.name}</h5>
              <p className="text-success mb-1">{formatKES(item.suggested_price)}</p>

              <input
                type="number"
                min="1"
                value={item.quantity}
                className="form-control"
                style={{ width: '90px' }}
                onChange={(e) => updateQuantity(item.ID, Number(e.target.value))}
              />
            </div>

            <button
              className="btn btn-outline-danger"
              onClick={() => removeFromCart(item.ID)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <h4>Total: {formatKES(cartTotal)}</h4>

      <div className="d-flex gap-2 mt-3">
        <Link to="/checkout" className="btn btn-success">
          Proceed to Checkout
        </Link>

        <button className="btn btn-outline-secondary" onClick={clearCart}>
          Clear Cart
        </button>
      </div>
    </div>
  )
}

export default Cart