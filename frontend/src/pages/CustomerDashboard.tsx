import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./CustomerDashboard.css";

function CustomerDashboard() {
  const navigate = useNavigate();
  
  // Base States
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
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
                          
                          <button className="action-btn primary full-width">Request Booking</button>
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