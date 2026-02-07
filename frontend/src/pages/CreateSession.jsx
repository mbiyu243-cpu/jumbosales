import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi } from '../api/sessions'

function CreateSession() {
  const [formData, setFormData] = useState({
    item_name: '',
    item_description: '',
    starting_price: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
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

    setLoading(true)

    try {
      const response = await sessionApi.create({
        item_name: formData.item_name.trim(),
        item_description: formData.item_description.trim(),
        starting_price: startingPrice,
      })
      navigate(`/sessions/${response.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sale')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card shadow">
          <div className="card-header bg-success text-white">
            <h4 className="mb-0">
              <i className="bi bi-plus-circle"></i> Start New Sale
            </h4>
          </div>
          <div className="card-body p-4">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
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

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  name="item_description"
                  className="form-control"
                  rows="3"
                  placeholder="Additional details about the item..."
                  value={formData.item_description}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Starting Price (KES) *</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text">KES</span>
                  </div>
                  <input
                    type="number"
                    name="starting_price"
                    className="form-control form-control-lg"
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

              <hr />

              <button
                type="submit"
                className="btn btn-success btn-lg btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-lightning"></i> Start Sale
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateSession
