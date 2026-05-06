import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'
import { useState } from 'react'

function Navbar() {
  const { user, logout, isAuthenticated, isCashier } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [open, setOpen] = useState(false)
  const [showCartMenu, setShowCartMenu] = useState(false)
  const { cart, cartTotal, removeFromCart } = useCart()

  useEffect(() => {
  const handleClickOutside = () => setShowCartMenu(false)

  if (showCartMenu) {
    window.addEventListener('click', handleClickOutside)
  }

  return () => window.removeEventListener('click', handleClickOutside)
}, [showCartMenu])

useEffect(() => {
  const handleClickOutside = () => setShowProfileMenu(false)

  if (showProfileMenu) {
    window.addEventListener('click', handleClickOutside)
  }

  return () => window.removeEventListener('click', handleClickOutside)
}, [showProfileMenu])

const cartCount = cart.reduce(
  (sum, item) => sum + (Number(item.quantity) || 0),
  0
)

const formatKES = (amount) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount)

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <i className="bi bi-hammer me-2"></i>
          Jumbo Sales
        </Link>

        <button
  className="navbar-toggler"
  onClick={() => setOpen(!open)}
>
  <span className="navbar-toggler-icon"></span>
</button>

        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/sessions" onClick={() => setOpen(false)}>
                <i className="bi bi-collection"></i> Jumbo Sales
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/beneficiaries" onClick={() => setOpen(false)}>
                <i className="bi bi-heart"></i> Beneficiaries
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/products" onClick={() => setOpen(false)}>
                <i className="bi bi-box-seam"></i> Products
              </Link>
            </li>
            {isCashier && (
              <li className="nav-item">
                <Link className="nav-link" to="/sessions/create" onClick={() => setOpen(false)}>
                  <i className="bi bi-plus-circle"></i> New Sale
                </Link>
              </li>
            )}
          </ul>

          <ul className="navbar-nav ms-auto">
           {isAuthenticated && (
  <li className="nav-item dropdown me-3">
    <button
      className="nav-link btn btn-link text-light dropdown-toggle position-relative"
      type="button"
      onClick={(e) => {
  e.stopPropagation()
  setShowCartMenu(!showCartMenu)
  setShowProfileMenu(false)
}}
    >
      🛒 Cart
      {cartCount > 0 && (
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          {cartCount}
        </span>
      )}
    </button>

    <div
  className={`dropdown-menu dropdown-menu-end p-3 ${showCartMenu ? 'show' : ''}`}
  style={{
    minWidth: '320px',
    position: 'absolute',
    right: 0,
    display: showCartMenu ? 'block' : 'none',
  }}
  onClick={(e) => e.stopPropagation()}
>
      <h6 className="dropdown-header">Cart Items</h6>

      {cart.length === 0 ? (
        <p className="text-muted mb-0">Your cart is empty.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.ID} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <div>
                <strong>{item.name}</strong>
                <div className="small text-muted">
                  Qty: {item.quantity} × {formatKES(item.suggested_price)}
                </div>
              </div>

              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeFromCart(item.ID)}
              >
                ✕
              </button>
            </div>
          ))}

          <div className="mt-3 d-flex justify-content-between">
            <strong>Total:</strong>
            <strong>{formatKES(cartTotal)}</strong>
          </div>

          <div className="d-grid gap-2 mt-3">
            <Link
  to="/cart"
  className="btn btn-outline-primary btn-sm"
  onClick={() => setShowCartMenu(false)}
>
  View Cart
</Link>

<Link
  to="/checkout"
  className="btn btn-success btn-sm"
  onClick={() => setShowCartMenu(false)}
>
  Checkout
</Link>
          </div>
        </>
      )}
    </div>
  </li>
)} 
            {isAuthenticated ? (
              <li className="nav-item dropdown">
                <button
                  className="nav-link btn btn-link text-light dropdown-toggle"
                  id="profileDropdown"
                  onClick={(e) => {
  e.stopPropagation()
  setShowProfileMenu(!showProfileMenu)
  setShowCartMenu(false)
}}
                  style={{ cursor: 'pointer', border: 'none', padding: '0.5rem 1rem' }}
                >
                  <i className="bi bi-person-circle"></i> {user.name}
                  <span className="ms-2 badge bg-light text-dark">{user.role}</span>
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-right ${showProfileMenu ? 'show' : ''}`}
                  style={{
                    position: 'absolute',
                    right: 0,
                    display: showProfileMenu ? 'block' : 'none',
                    minWidth: '200px',
                  }}
                >
                  <h6 className="dropdown-header">{user.name}</h6>
                  <p className="dropdown-item small text-muted mb-0">{user.email}</p>
                  <small className="dropdown-item text-muted">📞 {user.phone}</small>
                  <div className="dropdown-divider"></div>
                  <Link
  to="/profile"
  className="dropdown-item"
  onClick={() => setShowProfileMenu(false)}
>
  <i className="bi bi-person"></i> Profile
</Link>

<Link
  to="/settings"
  className="dropdown-item"
  onClick={() => setShowProfileMenu(false)}
>
  <i className="bi bi-gear"></i> Settings
</Link>
                  <div className="dropdown-divider"></div>
                  <button
                    className="dropdown-item text-danger"
                    onClick={() => {
                      setShowProfileMenu(false)
                      logout()
                    }}
                  >
                    <i className="bi bi-box-arrow-right"></i> Logout
                  </button>
                </div>
              </li>
            ) : (
              <>
               <li className="nav-item">
  <Link className="nav-link" to="/login" onClick={() => setOpen(false)}>
    Login
  </Link>
</li>

<li className="nav-item">
  <Link className="btn btn-success btn-sm ms-2" to="/register" onClick={() => setOpen(false)}>
    Register
  </Link>
</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
