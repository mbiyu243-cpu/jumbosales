import { formatKES, formatRelativeTime } from '../utils/format'

/**
 * BidList - Displays a list of bids for a session
 * Highlights the winning (latest) bid
 */
function BidList({ bids, currentUserId }) {
  if (!bids || bids.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle"></i> No bids yet. Be the first to bid!
      </div>
    )
  }

  // Sort by bid_order descending (latest first)
  const sortedBids = [...bids].sort((a, b) => b.bid_order - a.bid_order)
  const latestBidId = sortedBids[0]?.ID

  return (
    <div className="bid-list">
      {sortedBids.map((bid) => (
        <div
          key={bid.ID}
          className={`bid-item ${bid.ID === latestBidId ? 'winning' : ''}`}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="badge badge-secondary mr-2">#{bid.bid_order}</span>
              <strong>{bid.bidder?.name || 'Anonymous'}</strong>
              {bid.bidder_id === currentUserId && (
                <span className="badge badge-primary ml-2">You</span>
              )}
            </div>
            <div className="text-right">
              <div className="font-weight-bold">{formatKES(bid.bid_amount)}</div>
              <small className="text-success">+{formatKES(bid.increment_paid)}</small>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{formatRelativeTime(bid.CreatedAt)}</small>
            {bid.payment?.transaction_ref && (
              <small className="text-info">
                <i className="bi bi-phone"></i> {bid.payment.transaction_ref}
              </small>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default BidList
