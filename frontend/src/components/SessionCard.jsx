import { Link } from 'react-router-dom'
import { formatKES, getStatusClass } from '../utils/format'

/**
 * SessionCard - Displays an auction session summary
 * Used in session list views
 */
function SessionCard({ session }) {
  const { id, item_name, item_description, current_price, total_collected, status, cashier } = session

  return (
    <div className="card session-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{item_name}</h5>
          <span className={`badge ${getStatusClass(status)}`}>{status}</span>
        </div>

        {item_description && (
          <p className="card-text text-muted small">{item_description}</p>
        )}

        <div className="mt-3">
          <div className="d-flex justify-content-between">
            <span className="text-muted">Current Price:</span>
            <span className="font-weight-bold text-success">{formatKES(current_price)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Total Collected:</span>
            <span className="font-weight-bold text-info">{formatKES(total_collected)}</span>
          </div>
        </div>

        {cashier && (
          <p className="card-text mt-2 small text-muted">
            <i className="bi bi-person"></i> Cashier: {cashier.name}
          </p>
        )}
      </div>

      <div className="card-footer bg-white">
        <Link to={`/sessions/${id}`} className="btn btn-primary btn-block">
          {status === 'open' ? (
            <>
              <i className="bi bi-lightning"></i> Join Auction
            </>
          ) : (
            <>
              <i className="bi bi-eye"></i> View Details
            </>
          )}
        </Link>
      </div>
    </div>
  )
}

export default SessionCard
