import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sessionApi } from '../api/sessions'
import { useAuth } from '../context/AuthContext'
import SessionCard from '../components/SessionCard'

function Sessions() {
  const [sessions, setSessions] = useState([])
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const { isCashier } = useAuth()

  const fetchSessions = async () => {
  console.log('Fetching sessions...')
  setLoading(true)
  setError('')

    try {
      const response = await sessionApi.list(filter || undefined, archived)
      setSessions(response.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load sales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  console.log('Sessions page mounted')
  fetchSessions()
}, [filter, archived])

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-collection"></i> Jumbo Sales
        </h2>

        {isCashier && (
          <Link to="/sessions/create" className="btn btn-success">
            <i className="bi bi-plus-circle"></i> New Sale
          </Link>
        )}
      </div>

      <div className="btn-group mb-4">
        <button className={`btn ${filter === '' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('')}>
          All
        </button>
        <button className={`btn ${filter === 'open' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setFilter('open')}>
          <i className="bi bi-lightning"></i> Live
        </button>
        <button className={`btn ${filter === 'closed' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setFilter('closed')}>
          Closed
        </button>
        <button className={`btn ${filter === 'complete' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setFilter('complete')}>
          Complete
        </button>
         <button
    className={`btn ${archived ? 'btn-dark' : 'btn-outline-dark'}`}
    onClick={() => {
      setArchived(!archived)
      setFilter('') // reset filter when switching
    }}
  >
    📦 Archived
  </button>
</div>
{archived && (
  <div className="alert alert-secondary">
    📦 Showing archived sales
  </div>
)}

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No sales found.
          {isCashier && <span> <Link to="/sessions/create">Start one now!</Link></span>}
        </div>
      ) : (
        <div className="row">
          {sessions.map((session) => (
            <div key={session.ID} className="col-md-6 col-lg-4 mb-4">
              <SessionCard session={session} />

              {isCashier && (
                <button
                  className="btn btn-outline-danger btn-block mt-2"
                  onClick={async () => {
                    if (!confirm('Archive this sale?')) return

                    try {
                      await sessionApi.delete(session.ID)
                      fetchSessions()
                    } catch (err) {
                      console.error(err)
                      setError('Failed to archive sale')
                    }
                  }}
                >
                  📦 Archive Sale
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Sessions