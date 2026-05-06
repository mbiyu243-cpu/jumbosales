import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { sessionApi, beneficiaryApi } from '../api/sessions'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../hooks/useSSE'
import { formatKES, getStatusClass } from '../utils/format'
import BidList from '../components/BidList'
import BidForm from '../components/BidForm'

function SessionDetail() {
  const { id } = useParams()
  const { user, isCashier } = useAuth()

  const [session, setSession] = useState(null)
  const [bids, setBids] = useState([])
  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [donating, setDonating] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [isEndingSoon, setIsEndingSoon] = useState(false)

  // SSE for real-time updates
  const handleSSEMessage = useCallback((event) => {
    if (event.type === 'new_bid') {
      // Update session price and add new bid
      setSession((prev) => ({
        ...prev,
        current_price: event.data.current_price,
        total_collected: event.data.total_collected,
      }))
      setBids((prev) => [
        {
          id: event.data.bid_id,
          bid_amount: event.data.bid_amount,
          increment_paid: event.data.increment_paid,
          bid_order: event.data.bid_order,
          bidder_id: event.data.bidder_id,
          bidder: { name: event.data.bidder_name },
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
    } else if (event.type === 'session_closed') {
  setTimeLeft('Ended')
  setIsEndingSoon(false)

  setSession((prev) => ({
    ...prev,
    status: 'closed',
    winner_id: event.data.winner_id || prev?.winner_id,
    winner: event.data.winner || prev?.winner,
  }))
}
  }, [])

  const { connected } = useSSE(
    session?.status === 'open' ? `/api/sessions/${id}/stream` : null,
    { onMessage: handleSSEMessage, enabled: session?.status === 'open' }
  )
  const calculateTimeLeft = (endTime) => {
  if (!endTime) return { label: '', ended: false, endingSoon: false }

  const diff = new Date(endTime) - new Date()

  if (diff <= 0) {
    return { label: 'Ended', ended: true, endingSoon: false }
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)

  return {
    label: `${hours}h ${minutes}m ${seconds}s`,
    ended: false,
    endingSoon: diff < 60000,
  }
}
 useEffect(() => {
  if (!session?.end_time) return

  const updateTimer = () => {
    const result = calculateTimeLeft(session.end_time)

    setTimeLeft(result.label)
    setIsEndingSoon(result.endingSoon)

    if (result.ended) {
      setTimeLeft('Ended')
      setIsEndingSoon(false)

      if (session.status === 'open') {
        fetchSession()
      }

      return true
    }

    return false
  }

  const endedImmediately = updateTimer()
  if (endedImmediately) return

  const interval = setInterval(() => {
    const ended = updateTimer()
    if (ended) clearInterval(interval)
  }, 1000)

  return () => clearInterval(interval)
}, [session?.end_time, session?.status])

  const fetchSession = async () => {
    setLoading(true)
    try {
      const response = await sessionApi.get(id)
      setSession(response.data)
      setBids(response.data.bids || [])
    } catch (err) {
      setError('Failed to load sale')
    } finally {
      setLoading(false)
    }
  }

  const fetchBeneficiaries = async () => {
    try {
      const response = await beneficiaryApi.list()
      setBeneficiaries(response.data)
    } catch (err) {
      console.error('Failed to load beneficiaries')
    }
  }
  useEffect(() => {
    fetchSession()
    fetchBeneficiaries()
  }, [id])

  const handlePlaceBid = async (bidData) => {
    await sessionApi.placeBid(id, bidData)
    // SSE will update the UI, but also refresh just in case
    fetchSession()
  }

  const handleCloseSession = async () => {
    if (!confirm('Are you sure you want to close this sale? This cannot be undone.')) {
      return
    }

    setClosing(true)
    try {
      await sessionApi.close(id)
      fetchSession()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close sale')
    } finally {
      setClosing(false)
    }
  }

  const handleDonate = async () => {
    if (!selectedBeneficiary) {
      setError('Please select a beneficiary')
      return
    }

    setDonating(true)
    try {
      await sessionApi.donate(id, { beneficiary_id: parseInt(selectedBeneficiary) })
      fetchSession()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to donate')
    } finally {
      setDonating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <div className="alert alert-danger">Sale not found</div>
  }

  const isOwner = session.cashier_id === user?.id
  const isWinner = session.winner_id === user?.id
  const timerEnded = timeLeft === 'Ended'
  const canBid = session.status === 'open' && !timerEnded
  const canClose = isOwner && session.status === 'open' && bids.length > 0
  const canDonate = isWinner && session.status === 'closed'

  return (
    <div>
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="close" onClick={() => setError('')}>
            <span>&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        {/* Left: Session Info */}
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h2 className="mb-1">{session.item_name}</h2>
                  {session.item_description && (
                    <p className="text-muted">{session.item_description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`badge badge-lg ${getStatusClass(session.status)}`}>
                    {session.status}
                  </span>
                  {connected && session.status === 'open' && (
                    <div className="live-indicator mt-2">LIVE</div>
                  )}
                </div>
              </div>

              {/* Price Display */}
              <div className="row text-center mb-4">
                <div className="col-4">
                  <div className="text-muted small">Starting Price</div>
                  <div className="h5">{formatKES(session.starting_price)}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Current Price</div>
                  <div className="current-price">{formatKES(session.current_price)}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Total Collected</div>
                  <div className="h5 text-info">{formatKES(session.total_collected)}</div>
                </div>
              </div>

              {/* Cashier Actions */}
              {canClose && (
                <div className="alert alert-warning">
                  <strong>Cashier Controls</strong>
                  <p className="mb-2">Ready to close? Count 1, 2, 3 — if no one opposes, close the sale.</p>
                  <button
                    className="btn btn-danger"
                    onClick={handleCloseSession}
                    disabled={closing}
                  >
                    {closing ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2"></span>
                        Closing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-hammer"></i> Close Sale
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Winner Donation */}
              {canDonate && (
                <div className="alert alert-success">
                  <strong>🎉 Congratulations! You won this sale!</strong>
                  <p>Now choose a beneficiary to receive "{session.item_name}":</p>
                  <div className="form-group">
                    <select
                      className="form-control"
                      value={selectedBeneficiary}
                      onChange={(e) => setSelectedBeneficiary(e.target.value)}
                    >
                      <option value="">-- Select Beneficiary --</option>
                      {beneficiaries.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleDonate}
                    disabled={donating || !selectedBeneficiary}
                  >
                    {donating ? 'Donating...' : 'Donate Item'}
                  </button>
                </div>
              )}

              {/* Session Complete */}
              {session.status === 'complete' && (
                <div className="alert alert-info">
                  <i className="bi bi-check-circle"></i> This sale is complete. 
                  The item has been donated to a beneficiary.
                </div>
              )}  

              {/* Winner */}              
              {session.status === 'closed' && (
                <div className="alert alert-success">
                  🏆 Winner: <strong>{session.winner?.name || 'Winner will appear after refresh'}</strong>
                </div>
              )}
  
            </div>
          </div>
          {session?.end_time && (
  <div className={`alert ${isEndingSoon ? 'alert-danger' : 'alert-warning'} d-flex justify-content-between`}>
    <strong>⏳ Time Left:</strong>
    <span className="fw-bold">{timeLeft}</span>
  </div>
)}

          {/* Bid List */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-list-ol"></i> Bid History ({bids.length} bids)
              </h5>
            </div>
            <div className="card-body">
              <BidList bids={bids} currentUserId={user?.id} />
            </div>
          </div>
        </div>

        {/* Right: Bid Form */}
        <div className="col-lg-4">
         <div className="card sticky-top" style={{ top: '1rem' }}>
  <div className={canBid ? 'card-header bg-success text-white' : 'card-header bg-secondary text-white'}>
    <h5 className="mb-0">
      <i className="bi bi-lightning"></i> Place Your Bid
    </h5>
  </div>

  <div className="card-body">
    {!canBid && (
      <div className="alert alert-secondary">
        🔒 Bidding is closed for this sale
      </div>
    )}

    <BidForm
      currentPrice={session.current_price}
      sessionId={session.ID}
      onSubmit={handlePlaceBid}
      disabled={!canBid}
    />
  </div>
</div>
          
        </div>
      </div>
    </div>
  )
}

export default SessionDetail
