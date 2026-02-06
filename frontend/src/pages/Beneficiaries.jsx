import { useState, useEffect } from 'react'
import { beneficiaryApi } from '../api/sessions'
import { useAuth } from '../context/AuthContext'

function Beneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    contact_info: '',
  })
  const [saving, setSaving] = useState(false)

  const { isCashier } = useAuth()

  useEffect(() => {
    fetchBeneficiaries()
  }, [])

  const fetchBeneficiaries = async () => {
    setLoading(true)
    try {
      const response = await beneficiaryApi.list()
      setBeneficiaries(response.data)
    } catch (err) {
      setError('Failed to load beneficiaries')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await beneficiaryApi.create(formData)
      setShowForm(false)
      setFormData({ name: '', description: '', category: '', location: '', contact_info: '' })
      fetchBeneficiaries()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add beneficiary')
    } finally {
      setSaving(false)
    }
  }

  const categories = ['orphanage', 'school', 'hospital', 'elderly home', 'community', 'other']

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-heart"></i> Beneficiaries
        </h2>
        {isCashier && (
          <button
            className="btn btn-success"
            onClick={() => setShowForm(!showForm)}
          >
            <i className="bi bi-plus-circle"></i> Add Beneficiary
          </button>
        )}
      </div>

      <p className="text-muted mb-4">
        These are the organizations and individuals who can receive donated items from auction winners.
      </p>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Add New Beneficiary</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g., Sunshine Orphanage"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      className="form-control"
                      value={formData.category}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Select category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  rows="2"
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      className="form-control"
                      placeholder="e.g., Nairobi, Kenya"
                      value={formData.location}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Contact Info</label>
                    <input
                      type="text"
                      name="contact_info"
                      className="form-control"
                      placeholder="Phone or email"
                      value={formData.contact_info}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Saving...' : 'Add Beneficiary'}
              </button>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : beneficiaries.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No beneficiaries added yet.
        </div>
      ) : (
        <div className="row">
          {beneficiaries.map((b) => (
            <div key={b.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{b.name}</h5>
                  {b.category && (
                    <span className="badge badge-info mb-2">{b.category}</span>
                  )}
                  {b.description && (
                    <p className="card-text small text-muted">{b.description}</p>
                  )}
                  {b.location && (
                    <p className="card-text small">
                      <i className="bi bi-geo-alt"></i> {b.location}
                    </p>
                  )}
                  {b.contact_info && (
                    <p className="card-text small">
                      <i className="bi bi-telephone"></i> {b.contact_info}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Beneficiaries
