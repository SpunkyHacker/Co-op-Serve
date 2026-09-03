import { X } from "lucide-react";
import { useState } from "react";
import "./App.css";
import {
  Wrench,
  Droplets,
  Hammer,
  Paintbrush,
  Sparkles,
  MapPin,
  Star,
  Navigation,
} from "lucide-react";

import Navbar from "./components/Navbar";
import WorkerCard from "./components/WorkerCard";
import { workers, type Worker } from "./data/workers";

function App() {
  const [selectedService, setSelectedService] =
    useState("All Services");

  const [searchQuery, setSearchQuery] = useState("");

  const services = [
    {
      name: "Electrician",
      icon: <Wrench size={24} />,
    },
    {
      name: "Plumber",
      icon: <Droplets size={24} />,
    },
    {
      name: "Carpenter",
      icon: <Hammer size={24} />,
    },
    {
      name: "Painter",
      icon: <Paintbrush size={24} />,
    },
    {
      name: "Cleaner",
      icon: <Sparkles size={24} />,
    },
  ];

  /*
   * Search results
   *
   * Search checks:
   * - worker name
   * - service
   * - skills
   */
  const searchResults = workers.filter((worker) => {
    const search = searchQuery.toLowerCase().trim();

    return (
      worker.name.toLowerCase().includes(search) ||
      worker.service.toLowerCase().includes(search) ||
      worker.skills.some((skill) =>
        skill.toLowerCase().includes(search)
      )
    );
  });

  /*
   * Recently booked workers
   *
   * This is ONLY used on the normal dashboard.
   */
  const recentlyBookedWorkers = workers.filter(
    (worker) =>
      selectedService === "All Services" ||
      worker.service === selectedService
  );

  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

const handleRequest = (worker: Worker) => {
  setSelectedWorker(worker);
};

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="app">

      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* =====================================
          SEARCH / WORKER MATCHING VIEW
         ===================================== */}

      {isSearching ? (
        <main className="search-page">

          <div className="search-layout">

            {/* LEFT SIDE */}
            <section className="search-workers-section">

              <div className="search-heading">

                <div>
                  <h1>Workers Near You</h1>

                  <p>
                    {searchResults.length}{" "}
                    {searchResults.length === 1
                      ? "professional"
                      : "professionals"}{" "}
                    found for your request.
                  </p>
                </div>

                <select
                  className="sort-dropdown"
                  defaultValue="best"
                >
                  <option value="best">Best Match</option>
                  <option value="rating">
                    Highest Rated
                  </option>
                  <option value="distance">
                    Nearest
                  </option>
                  <option value="price">
                    Lowest Price
                  </option>
                </select>

              </div>

              <div className="search-worker-list">

                {searchResults.length > 0 ? (
                  searchResults.map((worker, index) => (
                    <div
                      className={`search-result-card ${
                        index === 0
                          ? "search-best-match"
                          : ""
                      }`}
                      key={worker.id}
                    >

                      {index === 0 && (
                        <div className="best-match">
                          ★ Best Match
                        </div>
                      )}

                      <div className="search-worker-left">

                        <img
                          src={worker.image}
                          alt={worker.name}
                          className="search-worker-image"
                        />

                        <div className="search-worker-info">

                          <div className="search-worker-name">
                            <h3>{worker.name}</h3>

                            {worker.verified && (
                              <span className="verified-small">
                                ✓
                              </span>
                            )}
                          </div>

                          <p className="search-worker-service">
                            {worker.service}
                          </p>

                          <div className="search-worker-stats">

                            <span className="rating-stat">
                              <Star
                                size={12}
                                fill="currentColor"
                              />
                              {worker.rating}
                              <small>
                                ({worker.reviews} reviews)
                              </small>
                            </span>

                            <span>
                              <MapPin size={12} />
                              {worker.distance} km away
                            </span>

                          </div>

                          <div className="search-worker-tags">
                            {worker.skills.map((skill) => (
                              <span key={skill}>
                                {skill}
                              </span>
                            ))}
                          </div>

                          <span
                            className={`search-availability ${
                              worker.availability ===
                              "Available Now"
                                ? "search-available"
                                : "search-busy"
                            }`}
                          >
                            {worker.availability}
                          </span>

                        </div>

                      </div>

                      <div className="search-worker-right">

                        <div className="search-rate">
                          <strong>
                            ₹{worker.rate}
                          </strong>
                          <span>/hr</span>
                        </div>

                        <p>
                          Est. arrival:{" "}
                          {worker.availability ===
                          "Available Now"
                            ? "15 mins"
                            : "30–45 mins"}
                        </p>

                        <button
                          className="search-request-button"
                          disabled={
                            worker.availability !==
                            "Available Now"
                          }
                          onClick={() =>
                            handleRequest(worker)
                          }
                        >
                          {worker.availability ===
                          "Available Now"
                            ? "Request"
                            : "Busy"}
                        </button>

                      </div>

                    </div>
                  ))
                ) : (
                  <div className="no-search-results">
                    <Sparkles size={25} />

                    <h3>
                      No professionals found
                    </h3>

                    <p>
                      Try another service, skill, or
                      professional name.
                    </p>
                  </div>
                )}

              </div>

            </section>

            {/* RIGHT SIDE MAP */}
            <section className="search-map-section">

              <div className="map-container">

                <div className="map-top-label">
                  <Navigation size={13} />
                  Your Location
                </div>

                <div className="map-design">

                  {/* Decorative roads */}
                  <div className="map-line map-line-1" />
                  <div className="map-line map-line-2" />
                  <div className="map-line map-line-3" />
                  <div className="map-line map-line-4" />

                  {/* Small map blocks */}
                  <div className="map-block block-1" />
                  <div className="map-block block-2" />
                  <div className="map-block block-3" />
                  <div className="map-block block-4" />
                  <div className="map-block block-5" />

                  {/* Worker locations */}
                  {searchResults.map((worker, index) => (
                    <div
                      className="worker-map-marker"
                      key={worker.id}
                      style={{
                        top: `${25 + index * 18}%`,
                        left: `${25 + (index % 2) * 42}%`,
                      }}
                    >
                      <MapPin size={20} />
                    </div>
                  ))}

                  {/* Your location */}
                  <div className="your-map-location">
                    <div className="location-ring" />
                    <div className="location-center" />
                    <span>You</span>
                  </div>

                </div>

                <div className="map-footer">
                  Showing matching professionals near you
                </div>

              </div>

            </section>

          </div>

        </main>
      ) : (

        /* =====================================
           NORMAL DASHBOARD
           ===================================== */

        <main className="dashboard">

          {/* Welcome */}
          <section className="welcome-section">

            <h1>
              What do you need help with today?
            </h1>

            <p>
              Find trusted, verified professionals from
              our cooperative community.
            </p>

          </section>

          {/* Services */}
          <section className="services-grid">

            <button
              className={`service-card ${
                selectedService === "All Services"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setSelectedService("All Services")
              }
            >
              <div className="service-icon">
                <Sparkles size={24} />
              </div>

              <span>All Services</span>
            </button>

            {services.map((service) => (
              <button
                key={service.name}
                className={`service-card ${
                  selectedService === service.name
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedService(service.name)
                }
              >
                <div className="service-icon">
                  {service.icon}
                </div>

                <span>{service.name}</span>
              </button>
            ))}

          </section>

          {/* Recently Booked */}
          <section className="workers-section">

            <div className="section-header">

              <div>
                <h2>Recently Booked</h2>

                <p>
                  Your previously booked service
                  professionals
                </p>
              </div>

              <span className="worker-count">
                {recentlyBookedWorkers.length} professionals
              </span>

            </div>

            <div className="workers-list">

              {recentlyBookedWorkers.length > 0 ? (
                recentlyBookedWorkers.map((worker) => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    onRequest={handleRequest}
                  />
                ))
              ) : (
                <div className="no-workers">
                  <p>
                    No recently booked professionals
                    in this category.
                  </p>
                </div>
              )}

            </div>

          </section>

        </main>
      )}

      {selectedWorker && (
  <div className="modal-overlay">
    <div className="booking-modal">
      <button
        className="modal-close"
        onClick={() => setSelectedWorker(null)}
      >
        <X size={20} />
      </button>

      <h2>Book {selectedWorker.name}</h2>
      <p className="modal-subtitle">
        {selectedWorker.service} · ₹{selectedWorker.rate}/hr
      </p>

      <div className="booking-form">
        <label>
          Date
          <input type="date" required />
        </label>

        <label>
          Time
          <input type="time" required />
        </label>

        <label>
          Work description
        <textarea
  placeholder="Describe what you need help with..."
  rows={4}
  required
/>
        </label>

        <div className="booking-estimate">
          <span>Estimated rate</span>
          <strong>₹{selectedWorker.rate}/hr</strong>
        </div>

        <button
          className="confirm-booking-button"
onClick={() => {
  setSelectedWorker(null);
  setBookingConfirmed(true);
}}
        >
          Confirm Booking
        </button>
      </div>
    </div>
  </div>
)}
{bookingConfirmed && (
  <div className="modal-overlay">
    <div className="booking-success">
      <div className="success-icon">✓</div>

      <h2>Booking Request Sent!</h2>

      <p>
        Your booking request has been sent successfully.
        The professional will respond shortly.
      </p>

      <button
        className="confirm-booking-button"
        onClick={() => setBookingConfirmed(false)}
      >
        Done
      </button>
    </div>
  </div>
)}

    </div>
  );
}

export default App;