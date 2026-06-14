import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { productApi } from '../api/sessions'
import api from '../api/client'

function Products() {
 const IMAGE_BASE_URL = "https://jumbosales.onrender.com"

const getImageUrl = (url) => {
  if (!url) return ""

  // Always use only the filename
  const filename = url.split("/").pop()

  return `${IMAGE_BASE_URL}/uploads/${filename}`
}

  const { isCashier } = useAuth()
  const navigate = useNavigate()
  const { addToCart, buyNow } = useCart()
  const handleAddToCart = (product) => {
  addToCart(product)
  alert(`${product.name} added to cart`)
  navigate('/cart')   // 👈 ADD THIS LINE
}
const handleBuyNow = (product) => {
  buyNow(product)
  navigate('/checkout')
}

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    suggested_price: '',
    image_url: '',
    images: [] // Array of uploaded image URLs
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

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    setUploadingImage(true)
    try {
      const uploadedUrls = []

      // Upload each file
      for (const file of acceptedFiles) {
        const uploadFormData = new FormData()
        uploadFormData.append('image', file)

        const response = await api.post('/products/upload-image', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        uploadedUrls.push(response.data.image_url)
      }

      // Add to images array
      setFormData({
        ...formData,
        images: [...formData.images, ...uploadedUrls],
        image_url: uploadedUrls[0] || formData.image_url // Set first as primary
      })
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload images')
    } finally {
      setUploadingImage(false)
    }
  }, [formData])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }
  })

  const handleRemoveImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      images: newImages,
      image_url: newImages[0] || '' // Set first as primary, or empty
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('image', file)

      const response = await api.post('/products/upload-image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setFormData({ ...formData, image_url: response.data.image_url })
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
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
    name: product.name || '',
    description: product.description || '',
    category: product.category || '',
    suggested_price: product.suggested_price ? product.suggested_price.toString() : '',
    image_url: product.image_url || '',
    images: product.image_url ? [product.image_url] : []
  })

  setShowForm(true)
}

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      suggested_price: '',
      image_url: '',
      images: []
    })
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
                    <label>Dropzone - Product Images</label>
                    
                    {/* Dropzone */}
                    <div
                      {...getRootProps()}
                      className={`border-2 rounded p-4 text-center cursor-pointer ${
                        isDragActive
                          ? 'border-primary bg-light'
                          : 'border-dashed border-secondary'
                      }`}
                      style={{
                        borderWidth: '2px',
                        borderStyle: 'dashed',
                        backgroundColor: isDragActive ? '#e7f3ff' : '#f8f9fa',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      <input {...getInputProps()} />
                      <div className="py-3">
                        <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                        <p className="mt-2 mb-0">
                          {isDragActive ? (
                            <strong>Drop images here...</strong>
                          ) : (
                            <>
                              <strong>Drag & drop images here</strong><br />
                              <small className="text-muted">or click to browse</small>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {uploadingImage && (
                      <div className="mt-2">
                        <small className="text-muted">
                          <span className="spinner-border spinner-border-sm mr-2"></span>
                          Uploading images...
                        </small>
                      </div>
                    )}

                    {/* Image Gallery */}
                    {formData.images.length > 0 && (
                      <div className="mt-3">
                        <label className="small text-muted mb-2 d-block">Uploaded Images ({formData.images.length})</label>
                        <div className="d-flex flex-wrap gap-2">
                          {formData.images.map((imageUrl, index) => (
                            <div key={index} className="position-relative">
                              <img
  src={
  imageUrl.startsWith('http')
    ? imageUrl
    : `${API_URL}${imageUrl}`
}
                                alt={`Product ${index + 1}`}
                                className={`img-thumbnail ${
                                  imageUrl === formData.image_url ? 'border-primary border-3' : ''
                                }`}
                                style={{
                                  width: '100px',
                                  height: '100px',
                                  objectFit: 'cover',
                                  cursor: 'pointer'
                                }}
                                onClick={() =>
                                  setFormData({ ...formData, image_url: imageUrl })
                                }
                              />
                              {imageUrl === formData.image_url && (
                                <span
                                  className="badge badge-primary"
                                  style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px'
                                  }}
                                >
                                  Primary
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{
                                  position: 'absolute',
                                  bottom: '5px',
                                  right: '5px',
                                  padding: '2px 6px',
                                  fontSize: '0.75rem'
                                }}
                                onClick={() => handleRemoveImage(index)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <small className="text-muted d-block mt-2">
                      Click on an image to set it as primary. Max 5MB per image.
                    </small>
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
    src={getImageUrl(product.image_url)}
    className="card-img-top"
    alt={product.name}
    style={{ height: '200px', objectFit: 'cover' }}
    onError={() => {
      console.log("RAW:", product.image_url)
      console.log("FINAL:", getImageUrl(product.image_url))
    }}
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
                    <div className="mt-3 d-flex gap-2">
    <button
      className="btn btn-primary btn-sm"
      onClick={() => handleBuyNow(product)}
    >
      🛒 Buy Now
    </button>

    <button
      className="btn btn-outline-secondary btn-sm"
      onClick={() => handleAddToCart(product)}
    >
      ➕ Add to Cart
    </button>
  </div>
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
