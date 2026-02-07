import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { isAuthenticated, isCashier } = useAuth()

  return (
    <div className="text-center py-5">
      {/* Hero Section */}
      <div className="mb-5">
        <h1 className="display-4">
          <i className="bi bi-hammer text-success"></i> Jumbo Sales
        </h1>
        <p className="lead text-muted">
          Crowd-Funded Charity Sales — Everyone Contributes, Winners Give
        </p>
      </div>

      {/* How It Works */}
      <div className="row mb-5">
        <div className="col-12">
          <h3 className="mb-4">How It Works</h3>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="display-4 text-primary mb-3">1</div>
              <h5>Item Listed</h5>
              <p className="text-muted">Cashier presents an item with a starting price</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="display-4 text-primary mb-3">2</div>
              <h5>Bid Up</h5>
              <p className="text-muted">Bidders increase the price — each pays only the increment</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="display-4 text-primary mb-3">3</div>
              <h5>1, 2, 3!</h5>
              <p className="text-muted">Cashier counts down — last bidder wins</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="display-4 text-success mb-3">
                <i className="bi bi-heart-fill"></i>
              </div>
              <h5>Donate</h5>
              <p className="text-muted">Winner chooses a beneficiary to receive the item</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-5">
        {isAuthenticated ? (
          <div>
            <Link to="/sessions" className="btn btn-success btn-lg mr-3">
              <i className="bi bi-collection"></i> View Live Sales
            </Link>
            {isCashier && (
              <Link to="/sessions/create" className="btn btn-outline-primary btn-lg">
                <i className="bi bi-plus-circle"></i> Start a Sale
              </Link>
            )}
          </div>
        ) : (
          <div>
            <Link to="/register" className="btn btn-success btn-lg mr-3">
              <i className="bi bi-person-plus"></i> Join Now
            </Link>
            <Link to="/login" className="btn btn-outline-primary btn-lg">
              <i className="bi bi-box-arrow-in-right"></i> Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
