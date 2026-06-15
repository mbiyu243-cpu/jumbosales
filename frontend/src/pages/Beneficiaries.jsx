import { useState, useEffect } from 'react'
import { beneficiaryApi } from '../api/sessions'
import { useAuth } from '../context/AuthContext'

function Beneficiaries() {
  const API_URL = import.meta.env.VITE_API_URL || "https://jumbosales.onrender.com"

  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [success, setSuccess] = useState('')

const getImageUrl = (url) => {
  if (!url) return ""

  // New Supabase images
  if (url.startsWith("http")) {
    return url
  }

  // Old Render uploads
  const filename = url.split("/").pop()
  return `https://jumbosales.onrender.com/uploads/${filename}`
}

const slideshowImages = beneficiaries
  .filter(b => b.photo_url)
  .map(b => getImageUrl(b.photo_url))

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    contact_info: '',
  })

  const { isCashier } = useAuth()

  useEffect(() => {
    fetchBeneficiaries()
  }, [])

  useEffect(() => {
  if (slideshowImages.length === 0) return

  const timer = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % slideshowImages.length)
  }, 3000)

  return () => clearInterval(timer)
}, [slideshowImages.length])

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
    console.log("SUBMIT TRIGGERED")
    
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const form = new FormData()
form.append('name', formData.name)
form.append('description', formData.description)
form.append('category', formData.category)
form.append('location', formData.location)
form.append('contact_info', formData.contact_info)

if (selectedFile) {
  form.append('photo', selectedFile)
}

    if (editingId) {
  await beneficiaryApi.update(editingId, form)
  setSuccess('Beneficiary updated successfully')
} else {
  await beneficiaryApi.create(form)
  setSuccess('Beneficiary added successfully')
}

setTimeout(() => setSuccess(''), 3000)
      setShowForm(false)
      setFormData({ name: '', description: '', category: '', location: '', contact_info: '' })
      setSelectedFile(null)
      setEditingId(null) 
      fetchBeneficiaries()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to add beneficiary')
    } finally {
      setSaving(false)
    }
  }
  const handleDelete = async (id) => {
  if (!window.confirm('Are you sure you want to delete this beneficiary?')) return

  try {
    await beneficiaryApi.delete(id)
    fetchBeneficiaries()
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to delete beneficiary')
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
  These are the organizations and individuals who can receive donated items from Jumbo Sale winners.
</p>

{error && (
  <div className="alert alert-danger">
    {error}
  </div>
)}

{success && (
  <div className="alert alert-success">
    {success}
  </div>
)}

{/* SLIDESHOW HERE */}
{slideshowImages.length > 0 && (
  <div className="card mb-4">
    <img
      src={slideshowImages[currentSlide]}
      alt="Beneficiaries slideshow"
      className="card-img-top"
      style={{ height: '300px', objectFit: 'cover' }}
    />

    <div className="card-body text-center">
      <button
        className="btn btn-sm btn-outline-secondary me-2"
        onClick={() =>
          setCurrentSlide(
            currentSlide === 0 ? slideshowImages.length - 1 : currentSlide - 1
          )
        }
      >
        Previous
      </button>

      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() =>
          setCurrentSlide((currentSlide + 1) % slideshowImages.length)
        }
      >
        Next
      </button>
    </div>
  </div>
)}

      {/* Add Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
  {editingId ? 'Edit Beneficiary' : 'Add New Beneficiary'}
</h5>
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
  <label>Photo</label>
  <input
    type="file"
    className="form-control"
    accept="image/*"
    onChange={(e) => setSelectedFile(e.target.files[0])}
    disabled={saving}
  />
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
                {saving ? 'Saving...' : editingId ? 'Update Beneficiary' : 'Add Beneficiary'}
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
      <div key={b.ID || b.id} className="col-md-6 col-lg-4 mb-4">
        <div className="card h-100">
          {b.photo_url && (
  <img
    src={getImageUrl(b.photo_url)}
    className="card-img-top"
    alt={b.name}
    style={{ height: '180px', objectFit: 'cover' }}
  />
)}

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

          {isCashier && (
            <div className="card-footer bg-white">
              <button
  className="btn btn-sm btn-outline-primary me-2"
  onClick={() => {
    setEditingId(b.ID || b.id)
    setShowForm(true)

    setFormData({
      name: b.name || '',
      description: b.description || '',
      category: b.category || '',
      location: b.location || '',
      contact_info: b.contact_info || '',
    })

    setSelectedFile(null)
  }}
>
  ✏️ Edit
</button>

              <button
  className="btn btn-sm btn-outline-danger"
  onClick={() => handleDelete(b.ID || b.id)}
>
  🗑 Delete
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

export default Beneficiaries