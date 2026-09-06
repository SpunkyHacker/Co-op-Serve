import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./CustomerDashboard.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

// Statuses that mean "nothing more will happen to this booking on its own"
const TERMINAL_STATUSES = ["rejected", "cancelled", "expired", "completed"];

function CustomerDashboard() {
  const navigate = useNavigate();
  
  // Base States
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null); // customers.id (NOT users.id)
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");

  // Worker Search & Filter States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  
  // Filter States
  const [sortPref, setSortPref] = useState("recommended");
  const [maxPrice, setMaxPrice] = useState("");
  const [reqGender, setReqGender] = useState("");
  const [mustBeVerified, setMustBeVerified] = useState(false);

  // Booking Request States (Discover tab)
  const [requestingWorkerId, setRequestingWorkerId] = useState<string | null>(null);
  const [requestedWorkerIds, setRequestedWorkerIds] = useState<Set<string>>(new Set());

  // My Bookings States
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [trackingByBooking, setTrackingByBooking] = useState<Record<string, any>>({});
  const bookingsRef = useRef<any[]>([]);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

  // Payment / Rating Modal States
  const [paymentModalBooking, setPaymentModalBooking] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [ratingGiven, setRatingGiven] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    const fetchSessionAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/customer-login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle(); 

      if (!error && data) setCustomerData(data);

      // customers.id is a separate row from users.id, and it's what
      // bookings.customer_id actually references - resolve it once up front.
      const { data: customerRow, error: customerErr } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!customerErr && customerRow) setCustomerId(customerRow.id);
      else if (customerErr) console.error("Failed to resolve customer record:", customerErr);

      setLoading(false);
    };

    fetchSessionAndData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customer-login");
  };

  // =========================================
  // FETCH WORKERS VIA PYTHON FASTAPI
  // =========================================
  const handleFindWorker = async (categoryName: string = selectedCategory || "") => {
    if (!categoryName) return;
    
    setSelectedCategory(categoryName);
    setLoadingWorkers(true);
    setWorkersList([]); 

    // Fallback coordinates (Chennai) in case geolocation fails or is slow
    let lat = 12.9716;
    let lng = 79.1325;

    // Try to get actual user location

    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 10000, 
            enableHighAccuracy: true,
            maximumAge: 0 
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Geolocation denied/timeout. Defaulting to Vellore coordinates.", err);
      }
    }
    if (customerData?.id) {
      const { error: updateErr } = await supabase
        .from('customers')
        .update({ location_lat: lat, location_lng: lng })
        .eq('user_id', customerData.id);
        
      if (updateErr) console.error("Failed to update customer location in DB:", updateErr);
    }

    // Reuse these coordinates when the customer requests a booking, so we
    // don't need to ask the browser for location again on every click.
    setCustomerCoords({ lat, lng });

    try {
      // Build API URL with Query Parameters
      const baseUrl = "http://localhost:8000/api/workers/search";
      const params = new URLSearchParams({
        customer_lat: lat.toString(),
        customer_lng: lng.toString(),
        skill_category: categoryName,
        sort_preference: sortPref,
        search_radius_km: "15.0"
      });

      if (maxPrice) params.append("max_price", maxPrice);
      if (reqGender) params.append("req_gender", reqGender);
      if (mustBeVerified) params.append("must_be_verified", "true");

      const response = await fetch(`${baseUrl}?${params.toString()}`);
      const data = await response.json();

      if (data.status === "success") {
        setWorkersList(data.results);
      } else {
        console.error("API returned an error:", data);
      }
    } catch (error) {
      console.error("Failed to fetch workers from backend:", error);
    }
    
    setLoadingWorkers(false);
  };

  const handleBackToServices = () => {
    setSelectedCategory(null);
    setWorkersList([]);
    // Reset filters
    setSortPref("recommended");
    setMaxPrice("");
    setReqGender("");
    setMustBeVerified(false);
  };

  // =========================================
  // GET (OR REUSE) THE CUSTOMER'S COORDINATES
  // =========================================
  const getCustomerCoords = async (): Promise<{ lat: number; lng: number }> => {
    if (customerCoords) return customerCoords;

    let lat = 12.9716;
    let lng = 79.1325;

    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 0,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Geolocation denied/timeout. Defaulting to fallback coordinates.", err);
      }
    }

    const coords = { lat, lng };
    setCustomerCoords(coords);
    return coords;
  };

  // =========================================
  // REQUEST A BOOKING WITH A SPECIFIC WORKER
  // =========================================
  const handleRequestBooking = async (worker: any) => {
    if (!customerId) {
      alert("We couldn't find your customer profile. Please refresh and try again.");
      return;
    }
    if (!selectedCategory) return;

    setRequestingWorkerId(worker.worker_id);

    try {
      const { lat, lng } = await getCustomerCoords();

      const response = await fetch(`${API_BASE}/api/bookings/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          customer_lat: lat,
          customer_lng: lng,
          worker_ids: [worker.worker_id],
          service_id: selectedCategory,
          price: worker.hourly_rate,
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload.status !== "success") {
        throw new Error(payload.detail || payload.message || "Unable to send booking request.");
      }

      setRequestedWorkerIds((current) => new Set(current).add(worker.worker_id));
      setActiveTab("bookings");
      fetchBookings();
    } catch (error: any) {
      console.error("Booking request failed:", error);
      alert(error.message || "Unable to send booking request.");
    } finally {
      setRequestingWorkerId(null);
    }
  };

  // =========================================
  // MY BOOKINGS: FETCH + LIVE TRACKING
  // =========================================
  const fetchBookings = useCallback(async () => {
    if (!customerId) return;

    setBookingsLoading(true);
    try {
      const { data, error } = await supabase
      .from("bookings")
      .select("id, group_id, price, status, expires_at, worker_id, workers(id, hourly_rate, users(name)), services(category)")
      .eq("customer_id", customerId)
      .order("id", { ascending: false })
      .limit(50);

      if (!error && data) setBookings(data);
      else if (error) console.error("Failed to load bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  }, [customerId]);

  const pollLiveTracking = useCallback(async () => {
    const active = bookingsRef.current.filter(
      (b) => !TERMINAL_STATUSES.includes(b.status) && b.status !== "pending"
    );
    if (active.length === 0) return;

    const results = await Promise.all(
      active.map(async (b) => {
        try {
          const res = await fetch(`${API_BASE}/api/bookings/${b.id}/tracking`);
          const payload = await res.json();
          return [b.id, payload] as const;
        } catch {
          return [b.id, null] as const;
        }
      })
    );

    setTrackingByBooking((current) => {
      const next = { ...current };
      for (const [id, payload] of results) {
        if (payload) next[id] = payload;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeTab === "bookings" && customerId) {
      fetchBookings();
    }
  }, [activeTab, customerId, fetchBookings]);

  useEffect(() => {
    if (activeTab !== "bookings") return;
    const interval = setInterval(() => {
      fetchBookings();
      pollLiveTracking();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, fetchBookings, pollLiveTracking]);

  // =========================================
  // FINALIZE: PAYMENT + RATING
  // =========================================
  const openPaymentModal = (booking: any) => {
    setPaymentModalBooking(booking);
    setPaymentMethod("upi");
    setRatingGiven(5);
    setReviewText("");
  };

  const handleSubmitPayment = async () => {
    if (!paymentModalBooking) return;

    setSubmittingPayment(true);
    try {
      const response = await fetch(`${API_BASE}/api/bookings/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: paymentModalBooking.id,
          worker_id: paymentModalBooking.worker_id,
          payment_amount: paymentModalBooking.price,
          payment_method: paymentMethod,
          rating_given: ratingGiven,
          review_text: reviewText,
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload.status !== "success") {
        throw new Error(payload.detail || payload.message || "Unable to complete payment.");
      }

      setPaymentModalBooking(null);
      fetchBookings();
    } catch (error: any) {
      console.error("Finalizing booking failed:", error);
      alert(error.message || "Unable to complete payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Mock data for services
// Mock data for services mapped to Database Categories
  const services = [
    { id: 1, name: "Electrician", dbCategory: "Electrical", icon: "⚡", desc: "Wiring, repairs, and installations." },
    { id: 2, name: "Plumber", dbCategory: "Plumbing", icon: "💧", desc: "Pipe leaks, fittings, and bathroom setups." },
    { id: 3, name: "Carpenter", dbCategory: "Carpentry", icon: "🪚", desc: "Furniture repair, doors, and custom woodwork." },
    { id: 4, name: "Cleaner", dbCategory: "Cleaning", icon: "🧹", desc: "Deep cleaning for homes and apartments." },
    { id: 5, name: "Painter", dbCategory: "Painting", icon: "🎨", desc: "Interior and exterior wall painting." },
    { id: 6, name: "Appliance Repair", dbCategory: "Appliance Repair", icon: "🔧", desc: "AC, Fridge, and Washing Machine fixing." },
    { id: 7, name: "Gardener", dbCategory: "Gardening", icon: "🌱", desc: "Lawn care, planting, and landscaping." },
  ];

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="customer-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="customer-dashboard-layout">
      {/* SIDEBAR NAVIGATION (Unchanged) */}
      <aside className="customer-sidebar">
        <div className="customer-sidebar-brand">
          <div className="customer-brand-logo">CS</div>
          <span>Co-op Serve</span>
        </div>

        <nav className="customer-sidebar-nav">
          <button className={`nav-btn ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => { setActiveTab('discover'); handleBackToServices(); }}>
            <span className="nav-icon">🔍</span> Discover Services
          </button>
          <button className={`nav-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <span className="nav-icon">📅</span> My Bookings
          </button>
          <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-icon">👤</span> Profile Settings
          </button>
        </nav>

        <div className="customer-sidebar-bottom">
          <div className="customer-mini-profile">
            <div className="avatar">{customerData?.name?.charAt(0) || "C"}</div>
            <div className="user-info">
              <strong>{customerData?.name || "Customer"}</strong>
              <span>{customerData?.role || "Member"}</span>
            </div>
          </div>
          <button className="customer-logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="customer-main-content">
        <header className="customer-content-header">
          <h1>
            {activeTab === 'discover' && !selectedCategory && "Discover Trusted Workers"}
            {activeTab === 'discover' && selectedCategory && `Available ${selectedCategory}s`}
            {activeTab === 'bookings' && "Your Active & Past Bookings"}
            {activeTab === 'profile' && "Manage Your Profile"}
          </h1>
          
          {activeTab === 'discover' && !selectedCategory && (
            <div className="customer-search-bar">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="What do you need help with?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          )}
        </header>

        {activeTab === 'discover' && (
          <div className="customer-tab-panel fade-in">
            
            {/* VIEW A: SERVICE GRID */}
            {!selectedCategory ? (
              <div className="services-grid">
                {filteredServices.map(service => (
                  <div key={service.id} className="service-card">
                    <div className="service-icon">{service.icon}</div>
                    <h3>{service.name}</h3>
                    <p>{service.desc}</p>
                    <button className="book-now-btn" onClick={() => handleFindWorker(service.dbCategory)}>
                      Find a {service.name}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              
              /* VIEW B: WORKER LIST & FILTERS */
              <div className="worker-list-container fade-in">
                <button className="back-link-btn" onClick={handleBackToServices}>
                  ← Back to Services
                </button>

                {/* FILTER BAR */}
                <div className="worker-filters">
                  <div className="filter-group">
                    <label>Sort By</label>
                    <select value={sortPref} onChange={(e) => setSortPref(e.target.value)}>
                      <option value="recommended">Recommended</option>
                      <option value="premium">Highest Rated</option>
                      <option value="budget">Lowest Price</option>
                      <option value="nearest">Nearest</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Max Price (₹/hr)</label>
                    <input type="number" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                  </div>

                  <div className="filter-group">
                    <label>Gender</label>
                    <select value={reqGender} onChange={(e) => setReqGender(e.target.value)}>
                      <option value="">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div className="filter-group checkbox">
                    <label>
                      <input type="checkbox" checked={mustBeVerified} onChange={(e) => setMustBeVerified(e.target.checked)} />
                      Verified Only
                    </label>
                  </div>

                  <button className="action-btn secondary apply-filters-btn" onClick={() => handleFindWorker()}>
                    Apply Filters
                  </button>
                </div>

                {/* RESULTS */}
                {loadingWorkers ? (
                  <div className="worker-list-loading">
                    <div className="spinner"></div>
                    <p>Finding verified {selectedCategory}s near you...</p>
                  </div>
                ) : (
                  <div className="worker-profiles-grid">
                    {workersList.length > 0 ? (
                      workersList.map((worker) => (
                        <div key={worker.worker_id} className="worker-profile-card">
                          <div className="worker-profile-header">
                            <div className="worker-avatar">
                              {worker.full_name.charAt(0)}
                            </div>
                            <div className="worker-title-info">
                              <h3>
                                {worker.full_name} 
                                {worker.is_verified && <span className="verified-badge">✓</span>}
                              </h3>
                              <span className="worker-location">
                                📍 {worker.distance_km} km away (~{worker.eta_mins} mins)
                              </span>
                            </div>
                          </div>
                          
                          <div className="worker-stats">
                            <div className="stat">
                              <span className="stat-label">Rating</span>
                              <span className="stat-value rating">★ {worker.avg_rating || "New"}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">Jobs</span>
                              <span className="stat-value">{worker.total_jobs_completed || 0}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">Rate</span>
                              <span className="stat-value">₹{worker.hourly_rate}/hr</span>
                            </div>
                          </div>
                          
                          <button
                            className="action-btn primary full-width"
                            disabled={requestingWorkerId === worker.worker_id || requestedWorkerIds.has(worker.worker_id)}
                            onClick={() => handleRequestBooking(worker)}
                          >
                            {requestingWorkerId === worker.worker_id
                              ? "Sending Request..."
                              : requestedWorkerIds.has(worker.worker_id)
                              ? "Requested ✓"
                              : "Request Booking"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="no-workers-state">
                        <span className="no-workers-icon">🔍</span>
                        <h3>No {selectedCategory}s match your criteria.</h3>
                        <p>Try adjusting your filters or checking back later.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MY BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="customer-tab-panel fade-in">
            {bookingsLoading && bookings.length === 0 ? (
              <div className="worker-list-loading">
                <div className="spinner"></div>
                <p>Loading your bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="no-workers-state">
                <span className="no-workers-icon">📅</span>
                <h3>No bookings yet.</h3>
                <p>Head to Discover Services to request a worker.</p>
              </div>
            ) : (
              <div className="bookings-container">
                {bookings.map((booking) => {
                  const workerName = booking.workers?.users?.name || "Worker";
                  const tracking = trackingByBooking[booking.id];
                  const statusClass =
                    booking.status === "completed" ? "completed" :
                    ["accepted", "traveling", "working"].includes(booking.status) ? "in-progress" :
                    booking.status;

                  return (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-header">
                        <span className={`booking-status ${statusClass}`}>
                          {booking.status.replace(/_/g, " ")}
                        </span>
                        <span className="booking-date">₹{booking.price}</span>
                      </div>

                      <div className="booking-details">
                      <div className="booking-service-info">
                        <h3>{booking.services?.category || "Service"}</h3>
                        <p>{workerName}</p>
                      </div>
                        <div className="booking-price">₹{booking.price}</div>
                      </div>

                      {booking.status === "pending" && (
                        <p className="active-job-note">
                          Waiting for {workerName} to respond. This request expires shortly if unanswered.
                        </p>
                      )}

                      {["accepted", "traveling", "working"].includes(booking.status) && (
                        <p className="active-job-note">
                          {workerName} is on the way{tracking?.worker_live_lat ? " — live location updating" : ""}.
                        </p>
                      )}

                      {booking.status === "completed_pending_payment" && (
                        <div className="booking-actions">
                          <button className="action-btn primary" onClick={() => openPaymentModal(booking)}>
                            Complete & Pay
                          </button>
                        </div>
                      )}

                      {["rejected", "cancelled", "expired"].includes(booking.status) && (
                        <p className="active-job-note">
                          This request didn't go through. Try requesting another worker.
                        </p>
                      )}

                      {booking.status === "completed" && (
                        <p className="active-job-note">Job completed and paid.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAYMENT + RATING MODAL */}
            {paymentModalBooking && (
              <div className="payment-modal-overlay" onClick={() => setPaymentModalBooking(null)}>
                <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                  <h2>Complete Payment</h2>
                  <p className="active-job-note">
                    Amount due: <strong>₹{paymentModalBooking.price}</strong>
                  </p>

                  <div className="filter-group full-width">
                    <label>Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>

                  <div className="filter-group full-width">
                    <label>Rate Your Worker</label>
                    <select value={ratingGiven} onChange={(e) => setRatingGiven(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group full-width">
                    <label>Review (optional)</label>
                    <textarea
                      rows={3}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="How was the service?"
                    />
                  </div>

                  <div className="booking-actions">
                    <button className="action-btn secondary" onClick={() => setPaymentModalBooking(null)} disabled={submittingPayment}>
                      Cancel
                    </button>
                    <button className="action-btn primary" onClick={handleSubmitPayment} disabled={submittingPayment}>
                      {submittingPayment ? "Processing..." : "Pay & Submit Rating"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="customer-tab-panel fade-in">
            <div className="profile-card" style={{
              background: '#fff', 
              padding: '2rem', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              maxWidth: '600px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ 
                  width: '60px', height: '60px', borderRadius: '50%', 
                  background: '#1e293b', color: 'white', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' 
                }}>
                  {customerData?.name?.charAt(0) || "C"}
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{customerData?.name || "Customer Profile"}</h2>
                  <span style={{ color: '#64748b', textTransform: 'capitalize' }}>
                    {customerData?.role || "Member"} Account
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Full Name
                  </label>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    {customerData?.name || "Not provided"}
                  </div>
                </div>

                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Email Address
                  </label>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    {customerData?.email || "Not provided"}
                  </div>
                </div>

                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Phone Number
                  </label>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    {customerData?.phone || "Not provided"}
                  </div>
                </div>
                
                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Account ID
                  </label>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', fontFamily: 'monospace' }}>
                    {customerData?.id || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CustomerDashboard;