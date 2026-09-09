import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";
import "./CustomerDashboard.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

// Statuses that mean "nothing more will happen to this booking on its own"
const TERMINAL_STATUSES = ["rejected", "cancelled", "expired", "completed"];
declare global {
  interface Window {
    Razorpay: any;
  }
}
function CustomerDashboard() {
  const navigate = useNavigate();

  // Booking Request States (Discover tab)
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [isRequesting, setIsRequesting] = useState(false);
const { t, i18n } = useTranslation();
  // Live Timer State
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    // Update the 'now' state every second to drive the countdown timers
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  
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

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

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

      if (error || !data) {
        console.error("Failed to load user profile:", error);
        await supabase.auth.signOut();
        navigate("/customer-login");
        return;
      }

      // Guard against a leftover/stale session from the worker portal
      // (shared browser storage, direct URL visit, etc.) rendering a
      // worker's account inside the customer dashboard.
      if (data.role !== "customer") {
        await supabase.auth.signOut();
        navigate("/customer-login");
        return;
      }

      setCustomerData(data);

      const { data: customerRow, error: customerErr } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (customerErr || !customerRow) {
        console.error("Failed to resolve customer record:", customerErr);
        await supabase.auth.signOut();
        navigate("/customer-login");
        return;
      }

      setCustomerId(customerRow.id);
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

    setCustomerCoords({ lat, lng });

    try {
      const baseUrl = `${API_BASE}/api/workers/search`;
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
    setSortPref("recommended");
    setMaxPrice("");
    setReqGender("");
    setMustBeVerified(false);
    setSelectedWorkerIds(new Set()); // Reset selections on back
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
  // REQUEST BOOKINGS
  // =========================================
  const handleRequestSelected = async () => {
    if (!customerId || selectedWorkerIds.size === 0 || !selectedCategory) return;
    setIsRequesting(true);

    try {
      const { lat, lng } = await getCustomerCoords();
      
      // Use the price of the first selected worker as the baseline for the group
      const firstWorkerId = Array.from(selectedWorkerIds)[0];
      const workerData = workersList.find(w => w.worker_id === firstWorkerId);
      const price = workerData ? workerData.hourly_rate : 0;

      const response = await fetch(`${API_BASE}/api/bookings/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          customer_lat: lat,
          customer_lng: lng,
          worker_ids: Array.from(selectedWorkerIds),
          service_id: selectedCategory,
          price: price,
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload.status !== "success") {
        throw new Error(payload.detail || payload.message || "Unable to send booking request.");
      }

      setSelectedWorkerIds(new Set());
      setActiveTab("bookings");
      fetchBookings();
    } catch (error: any) {
      console.error("Booking request failed:", error);
      showToast(error.message || "Unable to send booking request.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelSingle = async (bookingId: string) => {
    try {
      await fetch(`${API_BASE}/api/bookings/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, status: "cancelled" })
      });
      fetchBookings();
    } catch (error) {
      console.error("Failed to cancel request:", error);
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
      .select("id, group_id, price, status, expires_at, worker_id, workers(id, hourly_rate, users(name)), services(category), created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
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
      // 1. Ask backend to create a Razorpay order
      const orderRes = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: paymentModalBooking.id }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.detail || "Could not start payment.");

      // 2. Open Razorpay's checkout popup
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: "INR",
        name: "Co-op Serve",
        description: "Service payment",
        order_id: orderData.order_id,
        handler: async function (response: any) {
          // 3. On success, send proof to backend to verify + finalize
          try {
            const verifyRes = await fetch(`${API_BASE}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                booking_id: paymentModalBooking.id,
                worker_id: paymentModalBooking.worker_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                rating_given: ratingGiven,
                review_text: reviewText,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || verifyData.status !== "success") {
              throw new Error(verifyData.detail || "Payment could not be verified.");
            }
            setPaymentModalBooking(null);
            fetchBookings();
          } catch (err: any) {
            showToast(err.message || "Payment verification failed.");
          } finally {
            setSubmittingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmittingPayment(false); // user closed the popup without paying
          },
        },
        prefill: {},
        theme: { color: "#1a1a1a" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment init failed:", error);
      showToast(error.message || "Unable to start payment.");
      setSubmittingPayment(false);
    }
  };
  // Mock data for services mapped to Database Categories
// Mock data for services mapped to Database Categories
  const services = [
    { id: 1, name: t('customerDashboard.serviceCards.electrician'), dbCategory: "Electrical", icon: "⚡", desc: t('customerDashboard.serviceCards.electricianDesc') },
    { id: 2, name: t('customerDashboard.serviceCards.plumber'), dbCategory: "Plumbing", icon: "💧", desc: t('customerDashboard.serviceCards.plumberDesc') },
    { id: 3, name: t('customerDashboard.serviceCards.carpenter'), dbCategory: "Carpentry", icon: "🪚", desc: t('customerDashboard.serviceCards.carpenterDesc') },
    { id: 4, name: t('customerDashboard.serviceCards.cleaner'), dbCategory: "Cleaning", icon: "🧹", desc: t('customerDashboard.serviceCards.cleanerDesc') },
    { id: 5, name: t('customerDashboard.serviceCards.painter'), dbCategory: "Painting", icon: "🎨", desc: t('customerDashboard.serviceCards.painterDesc') },
    { id: 6, name: t('customerDashboard.serviceCards.appliance'), dbCategory: "Appliance Repair", icon: "🔧", desc: t('customerDashboard.serviceCards.applianceDesc') },
    { id: 7, name: t('customerDashboard.serviceCards.gardener'), dbCategory: "Gardening", icon: "🌱", desc: t('customerDashboard.serviceCards.gardenerDesc') },
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
      {/* SIDEBAR NAVIGATION */}
<aside className="customer-sidebar">
        <div className="customer-sidebar-brand">
          <div className="customer-brand-logo">CS</div>
          <span>{t('customerDashboard.sidebar.brand')}</span>
        </div>

        <nav className="customer-sidebar-nav">
          <button className={`nav-btn ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => { setActiveTab('discover'); handleBackToServices(); }}>
            <span className="nav-icon">🔍</span> {t('customerDashboard.sidebar.discover')}
          </button>
          <button className={`nav-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <span className="nav-icon">📅</span> {t('customerDashboard.sidebar.bookings')}
          </button>
          <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-icon">👤</span> {t('customerDashboard.sidebar.profile')}
          </button>
        </nav>

        <div className="customer-sidebar-bottom">
          <div className="customer-mini-profile">
            <div className="avatar">{customerData?.name?.charAt(0) || "C"}</div>
            <div className="user-info">
              <strong>{customerData?.name || t('customerDashboard.sidebar.defaultName')}</strong>
              <span>{customerData?.role || t('customerDashboard.sidebar.defaultRole')}</span>
            </div>
          </div>
          <button className="customer-logout-btn" onClick={handleLogout}>{t('customerDashboard.sidebar.signOut')}</button>
        </div>
      </aside>

      <main className="customer-main-content">
<header className="customer-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>
            {activeTab === 'discover' && !selectedCategory && t('customerDashboard.header.discoverTitle')}
            {activeTab === 'discover' && selectedCategory && t('customerDashboard.header.availableCategory', { category: selectedCategory })}
            {activeTab === 'bookings' && t('customerDashboard.header.bookingsTitle')}
            {activeTab === 'profile' && t('customerDashboard.header.profileTitle')}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {activeTab === 'discover' && !selectedCategory && (
              <div className="customer-search-bar">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder={t('customerDashboard.header.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            )}
            
            {/* LANGUAGE TOGGLE */}
            <select 
              value={i18n.language} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid #e5e9ee',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#0f172a'
              }}
            >
              <option value="en">EN</option>
              <option value="ta">TA</option>
              <option value="hi">HI</option>
            </select>
          </div>
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
                      {t('customerDashboard.services.findBtn', { service: service.name })}
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
                    <label>{t('customerDashboard.filters.sortBy')}</label>
                    <select value={sortPref} onChange={(e) => setSortPref(e.target.value)}>
                      <option value="recommended">{t('customerDashboard.filters.sortRecommended')}</option>
                      <option value="premium">{t('customerDashboard.filters.sortPremium')}</option>
                      <option value="budget">{t('customerDashboard.filters.sortBudget')}</option>
                      <option value="nearest">{t('customerDashboard.filters.sortNearest')}</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>{t('customerDashboard.filters.maxPrice')}</label>
                    <input type="number" placeholder={t('customerDashboard.filters.any')} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                  </div>

                  <div className="filter-group">
                    <label>{t('customerDashboard.filters.gender')}</label>
                    <select value={reqGender} onChange={(e) => setReqGender(e.target.value)}>
                      <option value="">{t('customerDashboard.filters.any')}</option>
                      <option value="male">{t('customerDashboard.filters.male')}</option>
                      <option value="female">{t('customerDashboard.filters.female')}</option>
                    </select>
                  </div>

                  <div className="filter-group checkbox">
                    <label>
                      <input type="checkbox" checked={mustBeVerified} onChange={(e) => setMustBeVerified(e.target.checked)} />
                      {t('customerDashboard.filters.verifiedOnly')}
                    </label>
                  </div>

                  <button className="action-btn secondary apply-filters-btn" onClick={() => handleFindWorker()}>
                    {t('customerDashboard.filters.applyFilters')}
                  </button>
                </div>
                {/* RESULTS */}
                {/* RESULTS */}
                {loadingWorkers ? (
                  <div className="worker-list-loading">
                    <div className="spinner"></div>
                    <p>{t('customerDashboard.workers.finding', { category: selectedCategory })}</p>
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
                                📍 {t('customerDashboard.workers.away', { distance: worker.distance_km, eta: worker.eta_mins })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="worker-stats">
                            <div className="stat">
                              <span className="stat-label">{t('customerDashboard.workers.rating')}</span>
                              <span className="stat-value rating">★ {worker.avg_rating || t('customerDashboard.workers.new')}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">{t('customerDashboard.workers.jobs')}</span>
                              <span className="stat-value">{worker.total_jobs_completed || 0}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">{t('customerDashboard.workers.rate')}</span>
                              <span className="stat-value">₹{worker.hourly_rate}/hr</span>
                            </div>
                          </div>
                          
                          <button
                            className={`action-btn full-width ${selectedWorkerIds.has(worker.worker_id) ? 'secondary' : 'primary'}`}
                            disabled={!selectedWorkerIds.has(worker.worker_id) && selectedWorkerIds.size >= 3}
                            onClick={() => {
                              const next = new Set(selectedWorkerIds);
                              if (next.has(worker.worker_id)) {
                                next.delete(worker.worker_id);
                              } else {
                                if (next.size < 3) next.add(worker.worker_id);
                              }
                              setSelectedWorkerIds(next);
                            }}
                          >
                            {selectedWorkerIds.has(worker.worker_id) ? t('customerDashboard.workers.selected') : t('customerDashboard.workers.select')}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="no-workers-state">
                        <span className="no-workers-icon">🔍</span>
                        <h3>{t('customerDashboard.workers.noMatch', { category: selectedCategory })}</h3>
                        <p>{t('customerDashboard.workers.tryAdjusting')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MY BOOKINGS TAB */}
        {/* MY BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="customer-tab-panel fade-in">
            {bookingsLoading && bookings.length === 0 ? (
              <div className="worker-list-loading">
                <div className="spinner"></div>
                <p>{t('customerDashboard.bookings.loading')}</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="no-workers-state">
                <span className="no-workers-icon">📅</span>
                <h3>{t('customerDashboard.bookings.noBookings')}</h3>
                <p>{t('customerDashboard.bookings.headToDiscover')}</p>
              </div>
            ) : (
              (() => {
                const enriched = bookings.map((booking: any) => {
                  const workerName = booking.workers?.users?.name || "Worker";
                  const safeStatus = booking.status || "pending";
                  const isPending = safeStatus === "pending";

                  let timeLeft = 0;
                  if (isPending && booking.expires_at) {
                    timeLeft = Math.max(0, Math.floor((new Date(booking.expires_at).getTime() - now) / 1000));
                  }
                  const isExpired = isPending && timeLeft === 0;
                  const displayStatus = isExpired ? "expired" : safeStatus;
                  const statusClass = (isExpired || ["rejected", "cancelled"].includes(safeStatus)) ? "cancelled" : safeStatus;

                  return { booking, workerName, isPending, timeLeft, isExpired, displayStatus, statusClass };
                });

                const isPast = (d: string) => ["completed", "rejected", "cancelled", "expired"].includes(d);
                const activeBookings = enriched.filter((b) => !isPast(b.displayStatus));
                const pastBookings = enriched.filter((b) => isPast(b.displayStatus));

                const renderCard = ({ booking, workerName, isPending, timeLeft, isExpired, displayStatus, statusClass }: any) => {
                  const tracking = trackingByBooking[booking.id];
                  return (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-header">
                        <span className={`booking-status ${statusClass}`}>
                          {displayStatus.replace(/_/g, " ")}
                        </span>
                        <span className="booking-date">₹{booking.price}</span>
                      </div>

                      <div className="booking-details">
                        <div className="booking-service-info">
                          <h3>{booking.services?.category || t('customerDashboard.bookings.serviceRequest')}</h3>
                          <p>{workerName}</p>
                        </div>
                        <div className="booking-price">₹{booking.price}</div>
                      </div>

                      {isPending && !isExpired && (
                        <div className="pending-timer-section">
                          <p className="active-job-note" style={{ margin: 0 }}>
                            {t('customerDashboard.bookings.waiting')} <strong style={{color: '#c44848'}}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</strong>
                          </p>
                          <button className="action-btn danger" onClick={() => handleCancelSingle(booking.id)}>
                            {t('customerDashboard.bookings.cancelRequest')}
                          </button>
                        </div>
                      )}

                      {["accepted", "traveling", "working"].includes(displayStatus) && (
                        <div className="active-tracking-box" style={{ background: '#f5f8fb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e9ee', marginTop: '16px' }}>
                          <p className="active-job-note" style={{ margin: '0 0 12px 0', fontWeight: 600, color: '#087c73' }}>
                            {t('customerDashboard.bookings.accepted', { workerName: workerName })}
                          </p>
                          
                          {tracking?.worker_live_lat && tracking?.worker_live_lng ? (
                            <a
                              className="action-btn primary"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                              href={`https://www.google.com/maps/search/?api=1&query=${tracking.worker_live_lat},${tracking.worker_live_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t('customerDashboard.bookings.viewMap')}
                            </a>
                          ) : (
                            <p style={{ fontSize: '12px', color: '#60768b', margin: 0 }}>
                              {t('customerDashboard.bookings.waitingGps')}
                            </p>
                          )}
                        </div>
                      )}

                      {displayStatus === "completed_pending_payment" && (
                        <div className="booking-actions">
                          <button className="action-btn primary" onClick={() => openPaymentModal(booking)}>
                            {t('customerDashboard.bookings.completePay')}
                          </button>
                        </div>
                      )}

                      {["rejected", "cancelled", "expired"].includes(displayStatus) && (
                        <p className="active-job-note">
                          {t('customerDashboard.bookings.notCompleted')}
                        </p>
                      )}

                      {displayStatus === "completed" && (
                        <p className="active-job-note">{t('customerDashboard.bookings.completed')}</p>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="bookings-list">
                    {activeBookings.length > 0 && (
                      <>
                        <h3 className="booking-section-title">{t('customerDashboard.bookings.activeTitle')}</h3>
                        {activeBookings.map(renderCard)}
                      </>
                    )}

                    {pastBookings.length > 0 && (
                      <>
                        <h3 className="booking-section-title">{t('customerDashboard.bookings.pastTitle')}</h3>
                        {pastBookings.map(renderCard)}
                      </>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* PROFILE TAB */}
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
                  <h2 style={{ margin: 0 }}>{customerData?.name || t('customerDashboard.profile.defaultTitle')}</h2>
                  <span style={{ color: '#64748b', textTransform: 'capitalize' }}>
                    {t('customerDashboard.profile.account', { role: customerData?.role || t('customerDashboard.sidebar.defaultRole') })}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('customerDashboard.profile.fullName')}
                  </label>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    {customerData?.name || t('customerDashboard.profile.notProvided')}
                  </div>
                </div>

                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('customerDashboard.profile.email')}
                  </label>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    {customerData?.email || t('customerDashboard.profile.notProvided')}
                  </div>
                </div>

                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('customerDashboard.profile.phone')}
                  </label>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    {customerData?.phone || t('customerDashboard.profile.notProvided')}
                  </div>
                </div>
                
                <div className="info-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('customerDashboard.profile.accountId')}
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

      {/* FLOATING ACTION BAR FOR MULTI-SELECT - MOVED OUTSIDE OF ANIMATED CONTAINERS */}
      {/* FLOATING ACTION BAR FOR MULTI-SELECT - MOVED OUTSIDE OF ANIMATED CONTAINERS */}
      {selectedWorkerIds.size > 0 && activeTab === 'discover' && (
        <div 
          className="floating-action-bar fade-in"
          style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            backgroundColor: '#0f172a',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}
        >
          <span>{t('customerDashboard.floatingBar.selectedCount', { count: selectedWorkerIds.size })}</span>
          <button className="action-btn primary" onClick={handleRequestSelected} disabled={isRequesting}>
            {isRequesting ? t('customerDashboard.floatingBar.sending') : t('customerDashboard.floatingBar.requestBtn')}
          </button>
        </div>
      )}

      {/* PAYMENT + RATING MODAL - MOVED OUTSIDE OF ANIMATED CONTAINERS */}
      {paymentModalBooking && (
        <div 
          className="payment-modal-overlay" 
          onClick={() => setPaymentModalBooking(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            className="payment-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h2>{t('customerDashboard.paymentModal.title')}</h2>
            <p className="active-job-note">
              {t('customerDashboard.paymentModal.amountDue')} <strong>₹{paymentModalBooking.price}</strong>
            </p>

            <div className="filter-group full-width">
              <label>{t('customerDashboard.paymentModal.paymentMethod')}</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="upi">{t('customerDashboard.paymentModal.upi')}</option>
                <option value="cash">{t('customerDashboard.paymentModal.cash')}</option>
              </select>
            </div>

            <div className="filter-group full-width">
              <label>{t('customerDashboard.paymentModal.rateWorker')}</label>
              <select value={ratingGiven} onChange={(e) => setRatingGiven(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
                ))}
              </select>
            </div>

            <div className="filter-group full-width">
              <label>{t('customerDashboard.paymentModal.review')}</label>
              <textarea
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={t('customerDashboard.paymentModal.reviewPlaceholder')}
              />
            </div>

            <div className="booking-actions">
              <button className="action-btn secondary" onClick={() => setPaymentModalBooking(null)} disabled={submittingPayment}>
                {t('customerDashboard.paymentModal.cancel')}
              </button>
              <button className="action-btn primary" onClick={handleSubmitPayment} disabled={submittingPayment}>
                {submittingPayment ? t('customerDashboard.paymentModal.processing') : t('customerDashboard.paymentModal.paySubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`toast-notification ${toast.type} fade-in`}>
          <span className="toast-icon">{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

export default CustomerDashboard;