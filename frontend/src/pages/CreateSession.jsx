import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi, productApi } from '../api/sessions'

function CreateSession() {
  const [formData, setFormData] = useState({
    item_name: '',
    item_description: '',
    starting_price: '',
    duration_minutes: '30',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')

  const navigate = useNavigate()
  useEffect(() => {
  const fetchProducts = async () => {
    try {
      const response = await productApi.list()
      setProducts(response.data || [])
    } catch (err) {
      console.error('Failed to load products', err)
    }
  }

  fetchProducts()
}, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  
  const handleProductSelect = (e) => {
  const productId = e.target.value
  setSelectedProductId(productId)

  if (!productId) {
    setFormData({
      item_name: '',
      item_description: '',
      starting_price: '',
      duration_minutes: formData.duration_minutes || '30',
    })
    return
  }

  const product = products.find((p) => String(p.ID) === productId)

  if (product) {
    setFormData({
      item_name: product.name || '',
      item_description: product.description || '',
      starting_price: product.suggested_price || '',
      duration_minutes: formData.duration_minutes || '30',
    })
  }
}
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    
    if (!formData.item_name.trim()) {
      setError('Item name is required')
      return
    }

    const startingPrice = parseFloat(formData.starting_price)
    if (isNaN(startingPrice) || startingPrice <= 0) {
      setError('Starting price must be greater than 0')
      return
    }

    const durationMinutes = Number(formData.duration_minutes)
    
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
     setError('Bidding duration must be greater than 0')
     return
    }

    setLoading(true)

    try {
      const response = await sessionApi.create({
        item_name: formData.item_name.trim(),
        item_description: formData.item_description.trim(),
        starting_price: startingPrice,
        duration_minutes: durationMinutes,
      })
      navigate(`/sessions/${response.data.ID || response.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sale')
    } finally {
      setLoading(false)
    }
  }

  return (
  <div className="row justify-content-center">
    <div className="col-lg-10">
      <div className="card shadow border-0">
        <div className="card-header bg-success text-white py-4">
          <h3 className="mb-1">
            <i className="bi bi-plus-circle me-2"></i>
            Start New Sale
          </h3>
          <p className="mb-0 small">
            Choose a catalog product or enter sale details manually.
          </p>
        </div>

        <div className="card-body p-4">
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-5 mb-4">
                <label className="fw-bold">Select Product</label>

                <select
                  className="form-control form-control-lg"
                  value={selectedProductId}
                  onChange={handleProductSelect}
                  disabled={loading}
                >
                  <option value="">Choose existing product...</option>
                  {products.map((product) => (
                    <option key={product.ID} value={product.ID}>
                      {product.name} — KES {product.suggested_price}
                    </option>
                  ))}
                </select>

                <small className="form-text text-muted">
                  Selecting a product auto-fills the sale details.
                </small>

                {selectedProductId && (() => {
                  const product = products.find(
                    (p) => String(p.ID) === selectedProductId
                  )

                  if (!product) return null

                  const imageSrc = product.image_url
                    ? product.image_url.startsWith('http')
                      ? product.image_url
                      : `http://localhost:8080${product.image_url}`
                    : null

                  return (
                    <div className="card mt-4 border-0 shadow-sm">
                      {imageSrc && (
                        <img
                          src={imageSrc}
                          alt={product.name}
                          className="card-img-top"
                          style={{
                            height: '230px',
                            objectFit: 'cover',
                            borderTopLeftRadius: '0.5rem',
                            borderTopRightRadius: '0.5rem',
                          }}
                        />
                      )}

                      <div className="card-body">
                        <h5 className="card-title mb-2">{product.name}</h5>

                        {product.category && (
                          <span className="badge bg-secondary mb-2">
                            {product.category}
                          </span>
                        )}

                        <p className="text-muted small mb-2">
                          {product.description || 'No description available'}
                        </p>

                        <h5 className="text-success mb-0">
                          KES {product.suggested_price}
                        </h5>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="col-md-7">
                <div className="card border-0 bg-light">
                  <div className="card-body">
                    <h5 className="mb-3">Sale Details</h5>

                    <div className="form-group mb-3">
                      <label>Item Name *</label>
                      <input
                        type="text"
                        name="item_name"
                        className="form-control form-control-lg"
                        placeholder="e.g., Jiko, Blanket, School Bag"
                        value={formData.item_name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group mb-3">
                      <label>Description</label>
                      <textarea
                        name="item_description"
                        className="form-control"
                        rows="4"
                        placeholder="Additional details about the item..."
                        value={formData.item_description}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group mb-3">
                      <label>Starting Price (KES) *</label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text">KES</span>
                        <input
                          type="number"
                          name="starting_price"
                          className="form-control"
                          placeholder="1000"
                          value={formData.starting_price}
                          onChange={handleChange}
                          min="1"
                          required
                          disabled={loading}
                        />
                      </div>
                      <small className="form-text text-muted">
                        This is the starting bid amount. Bidders will bid higher.
                      </small>
                    </div>

                    <div className="form-group mb-3">
  <label>Bidding Duration *</label>

  <div className="input-group input-group-lg">
    <input
      type="number"
      name="duration_minutes"
      className="form-control"
      placeholder="30"
      value={formData.duration_minutes}
      onChange={(e) =>
        setFormData({
          ...formData,
          duration_minutes: e.target.value,
        })
      }
      min="1"
      required
      disabled={loading}
    />
    <span className="input-group-text">minutes</span>
  </div>

  <small className="form-text text-muted">
    The sale will automatically end after this duration.
  </small>
</div>

                    <div className="alert alert-info small">
                      <strong>Preview:</strong> This sale will start at{' '}
                      <strong>
                        KES {formData.starting_price || '0'}
                      </strong>{' '}
                      for{' '}
                      <strong>
                        {formData.item_name || 'your selected item'}
                      </strong>.
                    </div>

                    <button
                      type="submit"
                      className="btn btn-success btn-lg w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Creating Sale...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-lightning-charge me-2"></i>
                          Start Sale
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
)
}

export default CreateSession