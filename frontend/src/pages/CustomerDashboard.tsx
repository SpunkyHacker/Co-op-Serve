// CustomerDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./CustomerDashboard.css";

function CustomerDashboard() {
  const navigate = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("discover"); // 'discover', 'bookings', 'profile'
  const [searchQuery, setSearchQuery] = useState("");

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

      if (!error && data) {
        setCustomerData(data);
      }
      
      setLoading(false);
    };

    fetchSessionAndData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customer-login");
  };

  // Mock data for services
  const services = [
    { id: 1, name: "Electrician", icon: "⚡", desc: "Wiring, repairs, and installations." },
    { id: 2, name: "Plumber", icon: "💧", desc: "Pipe leaks, fittings, and bathroom setups." },
    { id: 3, name: "Carpenter", icon: "🪚", desc: "Furniture repair, doors, and custom woodwork." },
    { id: 4, name: "Cleaner", icon: "🧹", desc: "Deep cleaning for homes and apartments." },
    { id: 5, name: "Painter", icon: "🎨", desc: "Interior and exterior wall painting." },
    { id: 6, name: "Appliance Repair", icon: "🔧", desc: "AC, Fridge, and Washing Machine fixing." },
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
      {/* =========================================
          SIDEBAR NAVIGATION
      ========================================= */}
      <aside className="customer-sidebar">
        <div className="customer-sidebar-brand">
          <div className="customer-brand-logo">CS</div>
          <span>Co-op Serve</span>
        </div>

        <nav className="customer-sidebar-nav">
          <button 
            className={`nav-btn ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            <span className="nav-icon">🔍</span> Discover Services
          </button>
          <button 
            className={`nav-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <span className="nav-icon">📅</span> My Bookings
          </button>
          <button 
            className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
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
          <button className="customer-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* =========================================
          MAIN CONTENT AREA
      ========================================= */}
      <main className="customer-main-content">
        
        {/* TOP HEADER */}
        <header className="customer-content-header">
          <h1>
            {activeTab === 'discover' && "Discover Trusted Workers"}
            {activeTab === 'bookings' && "Your Active & Past Bookings"}
            {activeTab === 'profile' && "Manage Your Profile"}
          </h1>
          {activeTab === 'discover' && (
            <div className="customer-search-bar">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="What do you need help with?" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </header>

        {/* TAB 1: DISCOVER SERVICES */}
        {activeTab === 'discover' && (
          <div className="customer-tab-panel fade-in">
            <div className="services-grid">
              {filteredServices.map(service => (
                <div key={service.id} className="service-card">
                  <div className="service-icon">{service.icon}</div>
                  <h3>{service.name}</h3>
                  <p>{service.desc}</p>
                  <button className="book-now-btn">Find a {service.name}</button>
                </div>
              ))}
              {filteredServices.length === 0 && (
                <div className="no-results">No services found matching "{searchQuery}"</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="customer-tab-panel fade-in">
            <div className="bookings-container">
              {/* Placeholder for Active Booking */}
              <div className="booking-card active-booking">
                <div className="booking-header">
                  <span className="booking-status in-progress">In Progress</span>
                  <span className="booking-date">Today, 2:30 PM</span>
                </div>
                <div className="booking-details">
                  <div className="booking-service-info">
                    <h3>Plumbing Repair</h3>
                    <p>Assigned to: <strong>Rajesh K.</strong> (★ 4.9)</p>
                  </div>
                  <div className="booking-price">₹450/hr</div>
                </div>
                <div className="booking-actions">
                  <button className="action-btn secondary">Message Worker</button>
                  <button className="action-btn primary">View Details</button>
                </div>
              </div>

              {/* Placeholder for Past Booking */}
              <div className="booking-card past-booking">
                <div className="booking-header">
                  <span className="booking-status completed">Completed</span>
                  <span className="booking-date">Aug 28, 2026</span>
                </div>
                <div className="booking-details">
                  <div className="booking-service-info">
                    <h3>Electrical Wiring Check</h3>
                    <p>Assigned to: <strong>Suresh M.</strong> (★ 4.8)</p>
                  </div>
                  <div className="booking-price">₹900 Total</div>
                </div>
                <div className="booking-actions">
                  <button className="action-btn secondary">Leave a Review</button>
                  <button className="action-btn secondary">Book Again</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE */}
        {activeTab === 'profile' && (
          <div className="customer-tab-panel fade-in">
            <div className="profile-card">
              <h2>Personal Information</h2>
              
              {customerData ? (
                <div className="profile-grid">
                  <div className="profile-field">
                    <label>Full Name</label>
                    <div className="field-value">{customerData.name}</div>
                  </div>
                  <div className="profile-field">
                    <label>Email Address</label>
                    <div className="field-value">{customerData.email}</div>
                  </div>
                  <div className="profile-field">
                    <label>Phone Number</label>
                    <div className="field-value">{customerData.phone}</div>
                  </div>
                  <div className="profile-field">
                    <label>Role</label>
                    <div className="field-value capitalize">{customerData.role}</div>
                  </div>
                </div>
              ) : (
                <p className="error-text">Failed to load profile data.</p>
              )}

              <div className="profile-actions">
                <button className="action-btn primary">Edit Profile</button>
                <button className="action-btn danger">Delete Account</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default CustomerDashboard;