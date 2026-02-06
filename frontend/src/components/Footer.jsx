import { Link } from 'react-router-dom'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-dark text-light py-4 mt-auto">
      <div className="container">
        <div className="row">
          {/* Brand & Description */}
          <div className="col-md-4 mb-3 mb-md-0">
            <h5 className="text-white">
              <i className="bi bi-hammer mr-2"></i>
              Jumbo Sales
            </h5>
            <p className="text-muted small mb-0">
              Crowd-funded charity auctions. Bid together, give together.
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-md-4 mb-3 mb-md-0">
            <h6 className="text-white">Quick Links</h6>
            <ul className="list-unstyled mb-0">
              <li>
                <Link to="/sessions" className="text-muted small">
                  <i className="bi bi-collection mr-1"></i> Auctions
                </Link>
              </li>
              <li>
                <Link to="/beneficiaries" className="text-muted small">
                  <i className="bi bi-heart mr-1"></i> Beneficiaries
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-muted small">
                  <i className="bi bi-person-plus mr-1"></i> Join Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-md-4">
            <h6 className="text-white">Contact</h6>
            <ul className="list-unstyled mb-0 small text-muted">
              <li>
                <i className="bi bi-envelope mr-1"></i> info@qpcgroupafrica.com
              </li>
              <li>
                <i className="bi bi-geo-alt mr-1"></i> Nairobi, Kenya
              </li>
              <li>
                <i className="bi bi-globe mr-1"></i> 
                <a href="https://qpcgroupafrica.com" className="text-muted" target="_blank" rel="noopener noreferrer">
                  qpcgroupafrica.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-secondary my-3" />

        <div className="row align-items-center">
          <div className="col-md-6 text-center text-md-left">
            <small className="text-muted">
              &copy; {currentYear} Jumbo Sales. All rights reserved.
            </small>
          </div>
          <div className="col-md-6 text-center text-md-right">
            <small className="text-muted">
              Powered by <a href="https://qpcgroupafrica.com" className="text-muted" target="_blank" rel="noopener noreferrer">QPC Group Africa</a>
            </small>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
