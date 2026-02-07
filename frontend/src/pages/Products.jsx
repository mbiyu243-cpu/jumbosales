import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { productApi } from '../api/sessions'

function Products() {
  const { isCashier } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    suggested_price: '',
    image_url: ''
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await productApi.list()
      setProducts(response.data || [])
    } catch (err) {
      setError('Failed to load products')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const data = {
        ...formData,
        suggested_price: parseFloat(formData.suggested_price)
      }

      if (editingProduct) {
        await productApi.update(editingProduct.ID, data)
      } else {
        await productApi.create(data)
      }

      setFormData({ name: '', description: '', category: '', suggested_price: '', image_url: '' })
      setShowForm(false)
      setEditingProduct(null)
      fetchProducts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product')
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      suggested_price: product.suggested_price.toString(),
      image_url: product.image_url || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      await productApi.delete(id)
      fetchProducts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({ name: '', description: '', category: '', suggested_price: '', image_url: '' })
  }

  const formatKES = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount)
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-box-seam me-2"></i>Products</h2>
        {isCashier && !showForm && (
          <button className="btn btn-success" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-circle"></i> Add Product
          </button>
        )}
      </div>

      <p className="text-muted mb-4">
        Catalog of items available for Jumbo Sales. Cashiers can add products to quickly create new sales.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Add/Edit Product Form */}
      {showForm && isCashier && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label>Suggested Price (KES) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.suggested_price}
                      onChange={(e) => setFormData({ ...formData, suggested_price: e.target.value })}
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Select category...</option>
                      <option value="furniture">Furniture</option>
                      <option value="electronics">Electronics</option>
                      <option value="clothing">Clothing</option>
                      <option value="household">Household Items</option>
                      <option value="food">Food & Groceries</option>
                      <option value="education">Educational Materials</option>
                      <option value="sports">Sports & Recreation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label>Image URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-group mb-3">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-circle"></i> {editingProduct ? 'Update' : 'Add'} Product
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-box-seam display-1 text-muted"></i>
          <p className="mt-3 text-muted">No products in catalog yet.</p>
          {isCashier && (
            <button className="btn btn-success" onClick={() => setShowForm(true)}>
              <i className="bi bi-plus-circle"></i> Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="row">
          {products.map(product => (
            <div key={product.ID} className="col-md-4 mb-4">
              <div className="card h-100">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    className="card-img-top"
                    alt={product.name}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}
                <div className="card-body">
                  <h5 className="card-title">{product.name}</h5>
                  {product.category && (
                    <span className="badge badge-secondary mb-2">{product.category}</span>
                  )}
                  <p className="card-text text-muted small">
                    {product.description || 'No description'}
                  </p>
                  <p className="card-text">
                    <strong className="text-success">{formatKES(product.suggested_price)}</strong>
                    <small className="text-muted"> suggested price</small>
                  </p>
                </div>
                {isCashier && (
                  <div className="card-footer bg-white border-top-0">
                    <button
                      className="btn btn-sm btn-outline-primary mr-2"
                      onClick={() => handleEdit(product)}
                    >
                      <i className="bi bi-pencil"></i> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(product.ID)}
                    >
                      <i className="bi bi-trash"></i> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Products
