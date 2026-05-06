import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Load user on mount if token exists
  useEffect(() => {
    if (token) {
      fetchCurrentUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/me')
      setUser(response.data)
      console.log('USER:', response.data)
    } catch (error) {
      // Token invalid, clear it
      logout()
    } finally {
      console.log('AUTH LOADING DONE')
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token: newToken, user: userData } = response.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)

    return userData
  }

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData)
    const { token: newToken, user: newUser } = response.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)

    return newUser
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isCashier: user?.role === 'cashier' || user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
