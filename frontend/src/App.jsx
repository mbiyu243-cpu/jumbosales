import api from './api/client'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext.jsx'

// Layout
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Sessions from './pages/Sessions'
import SessionDetail from './pages/SessionDetail'
import CreateSession from './pages/CreateSession'
import Beneficiaries from './pages/Beneficiaries'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    })
  }

  const submitProfileUpdate = async (e) => {
    e.preventDefault()

    try {
      await api.put('/me/profile', profileForm)
      alert('Profile updated successfully.')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile')
    }
  }

const handlePasswordChange = (e) => {
  setPasswordForm({
    ...passwordForm,
    [e.target.name]: e.target.value,
  })
}

const submitPasswordChange = async (e) => {
  e.preventDefault()

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    alert('New passwords do not match')
    return
  }

  if (passwordForm.newPassword.length < 6) {
    alert('New password must be at least 6 characters')
    return
  }

  try {
    await api.put('/me/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })

    alert('Password changed successfully.')

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })

    setShowPasswordForm(false)

  } catch (err) {
    alert(err.response?.data?.error || 'Failed to change password')
  }
}

const toggleDarkMode = () => {
  document.body.classList.toggle('bg-dark')
  document.body.classList.toggle('text-light')
}

const editProfile = () => {
  navigate('/profile')
}

const logoutAllDevices = async () => {
  await logout()
  navigate('/login')
}

  return (
    <CartProvider>
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/beneficiaries" element={<Beneficiaries />} />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <Sessions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions/:id"
            element={
              <ProtectedRoute>
                <SessionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions/create"
            element={
              <ProtectedRoute requiredRole="cashier">
                <CreateSession />
              </ProtectedRoute>
            }
          />

           {/* New Routes */}
           <Route
  path="/cart"
  element={
    <ProtectedRoute>
      <Cart />
    </ProtectedRoute>
  }
/>

<Route
  path="/checkout"
  element={
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  }
/>
          <Route
  path="/profile"
  element={
    <ProtectedRoute>
      <div className="card">
        <div className="card-body">
          <h2 className="mb-4">Edit Profile</h2>

          <form onSubmit={submitProfileUpdate}>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                name="name"
                className="form-control"
                value={profileForm.name}
                onChange={handleProfileChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={profileForm.email}
                onChange={handleProfileChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Phone</label>
              <input
                name="phone"
                className="form-control"
                value={profileForm.phone}
                onChange={handleProfileChange}
                required
              />
            </div>

            <p><strong>Role:</strong> {user?.role}</p>

            <button type="submit" className="btn btn-success me-2">
              Save Profile
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/settings')}
            >
              Back to Settings
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  }
/>

          <Route
  path="/settings"
  element={
    <ProtectedRoute>
      <div className="card">
        <div className="card-body">
          <h2 className="mb-4">Settings</h2>

          <div className="d-grid gap-3">

            <button onClick={toggleDarkMode} className="btn btn-outline-dark text-start">
  🌙 Toggle Dark Mode
</button>

<button
  onClick={() => setShowPasswordForm(!showPasswordForm)}
  className="btn btn-outline-warning text-start"
>
  🔒 Change Password
</button>

<button onClick={editProfile} className="btn btn-outline-info text-start">
  👤 Edit Profile
</button>

<button onClick={logoutAllDevices} className="btn btn-outline-danger text-start">
  🚪 Logout All Devices
</button>
{showPasswordForm && (
  <form onSubmit={submitPasswordChange} className="mt-4 border rounded p-3">
    <h5>Change Password</h5>

    <input
      type="password"
      name="currentPassword"
      className="form-control mb-2"
      placeholder="Current password"
      value={passwordForm.currentPassword}
      onChange={handlePasswordChange}
      required
    />

    <input
      type="password"
      name="newPassword"
      className="form-control mb-2"
      placeholder="New password"
      value={passwordForm.newPassword}
      onChange={handlePasswordChange}
      required
    />

    <input
      type="password"
      name="confirmPassword"
      className="form-control mb-3"
      placeholder="Confirm new password"
      value={passwordForm.confirmPassword}
      onChange={handlePasswordChange}
      required
    />

    <button type="submit" className="btn btn-success me-2">
      Save Password
    </button>

    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => setShowPasswordForm(false)}
    >
      Cancel
    </button>
  </form>
)}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  }
/>
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
   </CartProvider>
  )
}

export default App
