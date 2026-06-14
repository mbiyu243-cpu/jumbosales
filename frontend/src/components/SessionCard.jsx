import { Link } from 'react-router-dom'
import { formatKES, getStatusClass } from '../utils/format'

/**
 * SessionCard - Displays an auction session summary
 * Used in session list views
 */
function SessionCard({ session }) {

  const API_URL = import.meta.env.VITE_API_URL

const getImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${API_URL}${url}`
  return `${API_URL}/${url}`
}

  const { ID, item_name, item_description, current_price, total_collected, status, cashier, product } = session

  return (
    <div className="card session-card h-100 overflow-hidden">
      {/* Product Image */}
      {product?.image_url && (
  <img
    src={getImageUrl(product.image_url)}
    alt={item_name}
    className="card-img-top"
    style={{
      width: '100%',
      height: '220px',
      objectFit: 'cover',
      display: 'block',
      position: 'static'
    }}
  />
)}
      
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
        <Link to={`/sessions/${ID}`} className="btn btn-primary btn-block">
          {status === 'open' ? (
            <>
              <i className="bi bi-lightning"></i> Join Sale
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
