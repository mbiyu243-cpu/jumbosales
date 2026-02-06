import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sessionApi } from '../api/sessions'
import { useAuth } from '../context/AuthContext'
import SessionCard from '../components/SessionCard'

function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('') // '', 'open', 'closed', 'complete'

  const { isCashier } = useAuth()

  useEffect(() => {
    fetchSessions()
  }, [filter])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await sessionApi.list(filter || undefined)
      setSessions(response.data)
    } catch (err) {
      setError('Failed to load auctions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-collection"></i> Auctions
        </h2>
        {isCashier && (
          <Link to="/sessions/create" className="btn btn-success">
            <i className="bi bi-plus-circle"></i> New Auction
          </Link>
        )}
      </div>

      {/* Filter */}
      <div className="btn-group mb-4">
        <button
          className={`btn ${filter === '' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilter('')}
        >
          All
        </button>
        <button
          className={`btn ${filter === 'open' ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => setFilter('open')}
        >
          <i className="bi bi-lightning"></i> Live
        </button>
        <button
          className={`btn ${filter === 'closed' ? 'btn-info' : 'btn-outline-info'}`}
          onClick={() => setFilter('closed')}
        >
          Closed
        </button>
        <button
          className={`btn ${filter === 'complete' ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('complete')}
        >
          Complete
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No auctions found.
          {isCashier && (
            <span> <Link to="/sessions/create">Start one now!</Link></span>
          )}
        </div>
      ) : (
        <div className="row">
          {sessions.map((session) => (
            <div key={session.id} className="col-md-6 col-lg-4 mb-4">
              <SessionCard session={session} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Sessions
