import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./UserDashboard.css";

type Service = {
  name: string;
  description: string;
  icon: string;
  category: string;
};

type Worker = {
  name: string;
  service: string;
  rating: number;
  reviews: number;
  location: string;
  experience: string;
  price: string;
  initials: string;
};

function UserDashboard() {
  const [selectedService, setSelectedService] =
    useState("All Services");

  const [searchQuery, setSearchQuery] = useState("");

  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  // =========================================
  // SERVICES
  // =========================================

  const services: Service[] = [
    {
      name: "Electrician",
      description: "Electrical repairs, installation and maintenance.",
      icon: "⚡",
      category: "Home Repairs",
    },
    {
      name: "Plumber",
      description: "Pipes, taps, leaks and plumbing repairs.",
      icon: "🔧",
      category: "Home Repairs",
    },
    {
      name: "Carpenter",
      description: "Furniture, doors, fittings and woodwork.",
      icon: "🪚",
      category: "Home Repairs",
    },
    {
      name: "Painter",
      description: "Interior and exterior painting services.",
      icon: "🎨",
      category: "Home Improvement",
    },
    {
      name: "Cleaner",
      description: "Reliable home and deep cleaning services.",
      icon: "✨",
      category: "Home Care",
    },
    {
      name: "Gardener",
      description: "Garden maintenance and plant care.",
      icon: "🌱",
      category: "Outdoor",
    },
  ];

  // =========================================
  // SAMPLE WORKERS
  // =========================================

  const workers: Worker[] = [
    {
      name: "Rajesh Kumar",
      service: "Electrician",
      rating: 4.9,
      reviews: 124,
      location: "Chennai",
      experience: "8 years experience",
      price: "₹350 / visit",
      initials: "RK",
    },
    {
      name: "Suresh Babu",
      service: "Plumber",
      rating: 4.8,
      reviews: 96,
      location: "Chennai",
      experience: "6 years experience",
      price: "₹300 / visit",
      initials: "SB",
    },
    {
      name: "Arun Prakash",
      service: "Carpenter",
      rating: 4.9,
      reviews: 87,
      location: "Chennai",
      experience: "10 years experience",
      price: "₹450 / visit",
      initials: "AP",
    },
    {
      name: "Manoj Kumar",
      service: "Painter",
      rating: 4.7,
      reviews: 71,
      location: "Chennai",
      experience: "7 years experience",
      price: "₹500 / day",
      initials: "MK",
    },
    {
      name: "Vijay Raj",
      service: "Cleaner",
      rating: 4.8,
      reviews: 103,
      location: "Chennai",
      experience: "5 years experience",
      price: "₹400 / visit",
      initials: "VR",
    },
    {
      name: "Karthik S",
      service: "Gardener",
      rating: 4.9,
      reviews: 64,
      location: "Chennai",
      experience: "6 years experience",
      price: "₹350 / visit",
      initials: "KS",
    },
  ];

  // =========================================
  // FILTER WORKERS
  // =========================================

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesService =
        selectedService === "All Services" ||
        worker.service === selectedService;

      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        query === "" ||
        worker.name.toLowerCase().includes(query) ||
        worker.service.toLowerCase().includes(query) ||
        worker.location.toLowerCase().includes(query);

      return matchesService && matchesSearch;
    });
  }, [selectedService, searchQuery]);

  // =========================================
  // BOOK SERVICE
  // =========================================

  const handleBookService = (worker: Worker) => {
    alert(
      `Booking request started for ${worker.name} (${worker.service}).`
    );
  };

  return (
    <div className="dashboard-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="dashboard-header">

        <div className="dashboard-header-left">

          <Link
            to="/"
            className="dashboard-logo"
          >
            <span className="dashboard-logo-mark">
              CS
            </span>

            <span className="dashboard-logo-text">
              Co-op Serve
            </span>
          </Link>

          <span className="dashboard-owned-badge">
            <span>✓</span>
            Worker-Owned
          </span>

        </div>


        <div className="dashboard-header-right">

          <button className="dashboard-header-link">
            Help &amp; Support
          </button>

          <button className="dashboard-notification">
            🔔
          </button>

          <div className="dashboard-profile-wrapper">

            <button
              className="dashboard-profile-button"
              onClick={() =>
                setShowProfileMenu(!showProfileMenu)
              }
            >
              <span className="dashboard-avatar">
                CU
              </span>

              <span className="dashboard-profile-name">
                Customer
              </span>

              <span className="dashboard-profile-arrow">
                ▾
              </span>
            </button>


            {showProfileMenu && (
              <div className="dashboard-profile-menu">

                <button>
                  My Profile
                </button>

                <button>
                  My Bookings
                </button>

                <button>
                  Settings
                </button>

                <Link to="/customer-login">
                  Sign Out
                </Link>

              </div>
            )}

          </div>

        </div>

      </header>


      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="dashboard-main">

        {/* =========================================
            WELCOME SECTION
        ========================================= */}

        <section className="dashboard-welcome">

          <div>

            <p className="dashboard-eyebrow">
              CO-OP SERVE PLATFORM
            </p>

            <h1>
              Find trusted local services
            </h1>

            <p className="dashboard-welcome-text">
              Connect directly with verified worker-members
              in your community.
            </p>

          </div>


          <div className="dashboard-location">

            <span className="dashboard-location-icon">
              📍
            </span>

            <div>
              <span className="dashboard-location-label">
                Your location
              </span>

              <strong>
                Chennai, Tamil Nadu
              </strong>
            </div>

          </div>

        </section>


        {/* =========================================
            SEARCH
        ========================================= */}

        <section className="dashboard-search-section">

          <div className="dashboard-search-box">

            <span className="dashboard-search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search for a service or worker..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
            />

            {searchQuery && (
              <button
                className="dashboard-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ×
              </button>
            )}

          </div>

          <button className="dashboard-search-button">
            Search
          </button>

        </section>


        {/* =========================================
            SERVICE CATEGORIES
        ========================================= */}

        <section className="dashboard-services-section">

          <div className="dashboard-section-heading">

            <div>
              <h2>
                Browse Services
              </h2>

              <p>
                Choose a service to find skilled
                worker-members.
              </p>
            </div>

          </div>


          <div className="dashboard-service-list">

            <button
              className={`dashboard-service-card ${
                selectedService === "All Services"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setSelectedService("All Services")
              }
            >

              <span className="dashboard-service-icon">
                ✦
              </span>

              <span className="dashboard-service-name">
                All Services
              </span>

              <span className="dashboard-service-arrow">
                →
              </span>

            </button>


            {services.map((service) => (

              <button
                key={service.name}
                className={`dashboard-service-card ${
                  selectedService === service.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedService(service.name)
                }
              >

                <span className="dashboard-service-icon">
                  {service.icon}
                </span>

                <span className="dashboard-service-name">
                  {service.name}
                </span>

                <span className="dashboard-service-arrow">
                  →
                </span>

              </button>

            ))}

          </div>

        </section>


        {/* =========================================
            WORKER SECTION
        ========================================= */}

        <section className="dashboard-workers-section">

          <div className="dashboard-section-heading">

            <div>

              <h2>
                {selectedService === "All Services"
                  ? "Recommended Worker-Members"
                  : `${selectedService}s near you`}
              </h2>

              <p>
                Verified professionals with transparent
                pricing and community accountability.
              </p>

            </div>


            <span className="dashboard-result-count">
              {filteredWorkers.length} workers
            </span>

          </div>


          {/* =========================================
              WORKER CARDS
          ========================================= */}

          {filteredWorkers.length > 0 ? (

            <div className="dashboard-worker-grid">

              {filteredWorkers.map((worker) => (

                <article
                  className="dashboard-worker-card"
                  key={worker.name}
                >

                  <div className="dashboard-worker-top">

                    <div className="dashboard-worker-avatar">
                      {worker.initials}
                    </div>

                    <div className="dashboard-worker-basic">

                      <h3>
                        {worker.name}
                      </h3>

                      <span className="dashboard-worker-service">
                        {worker.service}
                      </span>

                    </div>

                    <span className="dashboard-verified">
                      ✓ Verified
                    </span>

                  </div>


                  <div className="dashboard-worker-rating">

                    <span className="dashboard-stars">
                      ★
                    </span>

                    <strong>
                      {worker.rating}
                    </strong>

                    <span>
                      ({worker.reviews} reviews)
                    </span>

                  </div>


                  <div className="dashboard-worker-details">

                    <span>
                      📍 {worker.location}
                    </span>

                    <span>
                      🛠 {worker.experience}
                    </span>

                  </div>


                  <div className="dashboard-worker-bottom">

                    <div>

                      <span className="dashboard-price-label">
                        Starting from
                      </span>

                      <strong className="dashboard-worker-price">
                        {worker.price}
                      </strong>

                    </div>


                    <button
                      className="dashboard-book-button"
                      onClick={() =>
                        handleBookService(worker)
                      }
                    >
                      View &amp; Book
                    </button>

                  </div>

                </article>

              ))}

            </div>

          ) : (

            <div className="dashboard-empty-state">

              <span>
                🔍
              </span>

              <h3>
                No workers found
              </h3>

              <p>
                Try another service or search term.
              </p>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedService("All Services");
                }}
              >
                View all workers
              </button>

            </div>

          )}

        </section>


        {/* =========================================
            COOPERATIVE INFO
        ========================================= */}

        <section className="dashboard-coop-banner">

          <div className="dashboard-coop-icon">
            ✓
          </div>

          <div>

            <h3>
              Your service supports worker ownership
            </h3>

            <p>
              Every booking helps build a fairer local
              service economy. Revenue goes directly to
              the worker-members who provide the service.
            </p>

          </div>

        </section>

      </main>


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="dashboard-footer">

        <span>
          © 2026 Co-op Serve • A Worker-Owned
          Cooperative Enterprise.
        </span>

      </footer>

    </div>
  );
}

export default UserDashboard;