import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.ID === product.ID)

      if (existing) {
        return prev.map((item) =>
          item.ID === product.ID
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const buyNow = (product) => {
    setCart([{ ...product, quantity: 1 }])
  }

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.ID !== id))
  }

  const clearCart = () => setCart([])

 const updateQuantity = (id, quantity) => {
  if (quantity === '') {
    setCart((prev) =>
      prev.map((item) =>
        item.ID === id ? { ...item, quantity: '' } : item
      )
    )
    return
  }

  if (quantity < 1) return

  setCart((prev) =>
    prev.map((item) =>
      item.ID === id ? { ...item, quantity } : item
    )
  )
}

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.suggested_price * (Number(item.quantity) || 0),
    0
  )

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        buyNow,
        removeFromCart,
        clearCart,
        updateQuantity,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)