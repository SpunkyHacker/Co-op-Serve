import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./WorkerDashboard.css";

type Status = "Available" | "Busy" | "Do not disturb" | "Appear offline";
type Tab = "jobs" | "active" | "history" | "payments" | "profile";

interface Job {
  booking_id: string;
  group_id: string;
  customer_id: string;
  title: string;
  customer: string;
  distance_km: number;
  eta_mins: number;
  price: number;
  category: string;
  lat: number;
  lng: number;
  expires_at?: string | null;
}

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

function WorkerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workerData, setWorkerData] = useState<any>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [status, setStatus] = useState<Status>("Available");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [activeJob, setActiveJob] = useState<any>(null);
  const [historyJobs, setHistoryJobs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const worker = workerData?.workers?.[0];
  const workerName = workerData?.name || "Worker";
  const skill = worker?.skill_category || "Worker";
  const rating = worker?.avg_rating || 0;
  const completedJobs = worker?.total_jobs_completed || 0;
  const hourlyRate = worker?.hourly_rate || 400;

  const loadJobs = useCallback(async () => {
    if (!workerId || !location || status !== "Available") return;
    setJobsLoading(true);
    setJobsError("");
    try {
      const query = new URLSearchParams({
        worker_lat: String(location.lat),
        worker_lng: String(location.lng),
        search_radius_km: "15",
      });
      const res = await fetch(`${API_BASE}/api/workers/${workerId}/requests?${query}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || payload.message || "Unable to load jobs.");
      setJobs(
        (payload.requests || []).map((item: any) => ({
          booking_id: item.booking_id,
          group_id: item.group_id,
          customer_id: item.customer_id,
          title: item.job_title || item.service_id || "Service Request",
          customer: item.customer_name || "Customer",
          distance_km: Number(item.distance_km || 0),
          eta_mins: Number(item.eta_mins || 0),
          price: Number(item.price || 0),
          category: payload.worker_skill || skill,
          lat: Number(item.customer_lat),
          lng: Number(item.customer_lng),
          expires_at: item.expires_at,
        }))
      );
    } catch (e: any) {
      console.error(e);
      setJobsError(e.message || "Unable to load nearby jobs.");
    } finally {
      setJobsLoading(false);
    }
  }, [location, skill, status, workerId]);

  const loadActiveJob = useCallback(async () => {
    if (!workerId) return;
    const { data, error } = await supabase
      .from("bookings")
      .select("id, group_id, customer_id, service_id, price, status, customer_lat, customer_lng, customers(name)")
      .eq("worker_id", workerId)
      .in("status", ["accepted", "traveling", "working"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) setActiveJob(data || null);
  }, [workerId]);

  const loadHistory = useCallback(async () => {
    if (!workerId) return;
    const { data } = await supabase
      .from("bookings")
      .select("id, service_id, price, status, customer_id, customers(name)")
      .eq("worker_id", workerId)
      .eq("status", "completed")
      .order("id", { ascending: false })
      .limit(50);
    setHistoryJobs(data || []);

    const bookingIds = (data || []).map((row: any) => row.id);
    if (!bookingIds.length) {
      setPayments([]);
      return;
    }
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("*")
      .in("booking_id", bookingIds)
      .order("booking_id", { ascending: false });
    setPayments(paymentRows || []);
  }, [workerId]);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/worker-login");
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, name, email, phone, role, home_address,
          workers (
            id, gender, skill_category, eshram_id, upi_id, hourly_rate,
            avg_rating, total_jobs_completed, is_available, location_lat, location_lng
          )
        `)
        .eq("id", session.user.id)
        .maybeSingle();
      if (!alive) return;
      if (!error && data) {
        setWorkerData(data);
        const w = data.workers?.[0];
        setWorkerId(w?.id || null);
        setStatus(w?.is_available === false ? "Busy" : "Available");
        if (w?.location_lat != null && w?.location_lng != null) {
          setLocation({ lat: Number(w.location_lat), lng: Number(w.location_lng) });
        }
      }
      setLoading(false);
    };
    init();
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => {
    if (!workerId) return;
    loadActiveJob();
    loadHistory();
  }, [workerId, loadActiveJob, loadHistory]);

  useEffect(() => {
    if (!workerId || !location || status !== "Available") return;
    loadJobs();
    const id = window.setInterval(loadJobs, 10000);
    return () => window.clearInterval(id);
  }, [loadJobs, location, status, workerId]);

  useEffect(() => {
    if (!workerId || !("geolocation" in navigator)) {
      if (workerId) setLocationError("This browser does not support GPS location.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setLocationError("");
        try {
          await fetch(`${API_BASE}/api/workers/update-location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ worker_id: workerId, lat, lng }),
          });
        } catch (e) {
          console.error("Location update failed", e);
        }
      },
      (error) => {
        console.error(error);
        setLocationError("Allow location access to find nearby jobs.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [workerId]);

  const setAvailability = async (available: boolean) => {
    if (!workerId) return;
    const res = await fetch(`${API_BASE}/api/workers/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id: workerId, is_available: available }),
    });
    const payload = await res.json();
    if (!res.ok) {
      alert(payload.detail || payload.message || "Unable to change availability.");
      return;
    }
    setStatus(available ? "Available" : "Busy");
    setStatusMenuOpen(false);
    if (!available) setJobs([]);
    setWorkerData((current: any) => ({
      ...current,
      workers: current?.workers?.map((item: any) => ({ ...item, is_available: available })),
    }));
  };

  const selectStatus = (next: Status) => {
    if (next === "Available") return setAvailability(true);
    return setAvailability(false);
  };

  const respondToJob = async (job: Job, action: "accept" | "reject") => {
    if (!workerId) return;
    setRespondingId(job.booking_id);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: job.booking_id,
          worker_id: workerId,
          group_id: job.group_id,
          action,
        }),
      });
      const payload = await res.json();
      if (!res.ok || payload.status === "failed") throw new Error(payload.message || "Unable to process job.");

      setJobs((current) => current.filter((item) => item.booking_id !== job.booking_id));
      setSelectedJob(null);

      if (action === "accept") {
        setStatus("Busy");
        setActiveJob({
          id: job.booking_id,
          group_id: job.group_id,
          customer_id: job.customer_id,
          service_id: job.title,
          price: job.price,
          status: "accepted",
          customer_lat: job.lat,
          customer_lng: job.lng,
          customers: { name: job.customer },
        });
        setActiveTab("active");
        if (payload.navigation_url) {
          window.open(payload.navigation_url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (e: any) {
      alert(e.message || "Unable to process job.");
    } finally {
      setRespondingId(null);
    }
  };

  const mapJobs = useMemo(() => jobs.map((job, index) => ({
    ...job,
    left: `${18 + ((index * 23) % 67)}%`,
    top: `${22 + ((index * 31) % 58)}%`,
  })), [jobs]);

  const totalPayments = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const statusClass = status.toLowerCase().replaceAll(" ", "-");

  if (loading) {
    return <div className="worker-dashboard-loading"><div className="spinner"></div><p>Loading your dashboard...</p></div>;
  }

  return (
    <div className="worker-dashboard-layout">
      <aside className="worker-sidebar">
        <div className="worker-sidebar-brand"><div className="worker-brand-logo">CS</div><span>Co-op Serve</span></div>

        <div className="worker-sidebar-account">
          <div className="worker-mini-profile">
            <div className="worker-mini-avatar">{workerName.charAt(0).toUpperCase()}</div>
            <div className="worker-user-info"><strong>{workerName}</strong><span>{skill}</span></div>
          </div>

          <div className="worker-status-wrapper">
            <button className={`worker-current-status ${statusClass}`} onClick={() => setStatusMenuOpen((v) => !v)}>
              <span className="status-dot"></span><span>{status}</span><span className="status-chevron">›</span>
            </button>
            {statusMenuOpen && (
              <div className="worker-status-menu">
                {(["Available", "Busy", "Do not disturb", "Appear offline"] as Status[]).map((item) => (
                  <button className="worker-status-option" key={item} onClick={() => selectStatus(item)}>
                    <span className={`status-option-dot ${item.toLowerCase().replaceAll(" ", "-")}`}></span>
                    <span>{item}</span>{status === item && <span className="status-check">✓</span>}
                  </button>
                ))}
                <div className="status-menu-divider"></div>
                <button className="worker-status-option"><span className="status-menu-icon">◷</span><span>Duration</span><span className="status-arrow">›</span></button>
                <button className="worker-status-option" onClick={() => setAvailability(true)}><span className="status-menu-icon">↶</span><span>Reset status</span></button>
                <button className="worker-status-option"><span className="status-menu-icon">⚙</span><span>Manage presence status</span></button>
              </div>
            )}
          </div>

          <button className="worker-logout-btn worker-account-logout" onClick={async () => { await supabase.auth.signOut(); navigate("/worker-login"); }}>
            Sign Out
          </button>
        </div>

        <nav className="worker-sidebar-nav">
          {[["jobs", "🔎", "Find Jobs"], ["active", "📋", "My Jobs"], ["history", "📜", "Work History"], ["payments", "💰", "Payments"], ["profile", "👤", "Profile"]].map(([tab, icon, label]) => (
            <button key={tab} className={`worker-nav-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab as Tab)}>
              <span className="worker-nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>

      </aside>

      <main className="worker-main-content">
        <header className="worker-content-header">
          <div>
            <h1>
              {activeTab === "jobs" && `Good evening, ${workerName}`}
              {activeTab === "active" && "My Jobs"}
              {activeTab === "history" && "Work History"}
              {activeTab === "payments" && "Payment History"}
              {activeTab === "profile" && "Manage Your Profile"}
            </h1>
            {activeTab === "jobs" && <p>{status === "Available" ? `You're available for nearby ${String(skill).toLowerCase()} jobs.` : "You're not currently receiving new job alerts."}</p>}
          </div>
          <button className="worker-notification-btn" title="Notifications">🔔{jobs.length > 0 && <span className="notification-badge">{jobs.length}</span>}</button>
        </header>

        {activeTab === "jobs" && (
          <div className="worker-tab-panel fade-in">

            {locationError && <div className="worker-location-warning"><strong>Location:</strong> {locationError}</div>}
            {jobsError && <div className="worker-location-warning"><strong>Jobs:</strong> {jobsError}</div>}

            <section className="worker-map-card">
              <div className="section-heading"><div><h2>Nearby Jobs</h2><p>{location ? `Matched to your ${String(skill).toLowerCase()} skill and GPS location` : "Waiting for your location"}</p></div><span className="map-radius-badge">Within 15 km</span></div>
              <div className="worker-map">
                <div className="map-grid"></div><div className="map-road road-one"></div><div className="map-road road-two"></div><div className="map-road road-three"></div>
                <div className="map-label label-one">Nearby area</div><div className="map-label label-two">Service area</div><div className="map-label label-three">Local jobs</div>
                <div className="worker-map-marker"><span className="worker-location-pulse"></span><span className="worker-location-dot">●</span><strong>You</strong></div>
                {mapJobs.map((job: any) => <button key={job.booking_id} className="job-map-marker" style={{ left: job.left, top: job.top }} onClick={() => setSelectedJob(job)}>₹{job.price}</button>)}
                <div className="map-controls"><button>+</button><button>−</button></div>
                <div className="map-phase-label">Live worker GPS connected</div>
              </div>
            </section>

            <section className="nearby-jobs-section">
              <div className="section-heading jobs-heading"><div><h2>Available jobs for you</h2><p>{jobsLoading ? "Looking for matching jobs..." : `${jobs.length} matching jobs nearby`}</p></div></div>
              {status !== "Available" ? (
                <div className="jobs-paused-state"><div className="empty-icon">⏸</div><h3>Job alerts are paused</h3><p>Set your status to Available to receive nearby jobs matched to your skill.</p><button className="action-btn primary" onClick={() => setAvailability(true)}>Go Available</button></div>
              ) : jobs.length === 0 && !jobsLoading ? (
                <div className="jobs-paused-state"><div className="empty-icon">🔎</div><h3>No matching jobs nearby</h3><p>The list refreshes automatically every 10 seconds.</p></div>
              ) : (
                <div className="worker-jobs-grid">
                  {jobs.map((job) => <article className="worker-job-card" key={job.booking_id}>
                    <div className="job-card-top"><div className="job-service-icon">⚡</div><span className="job-distance">{job.distance_km} km</span></div>
                    <h3>{job.title}</h3><p className="job-description">Request from {job.customer} for {job.category} service.</p>
                    <div className="job-meta"><span>👤 {job.customer}</span><span>📍 Customer location</span><span>🚗 {job.eta_mins} min</span></div>
                    <div className="job-card-footer"><div><small>Payment</small><strong>₹{job.price}</strong></div><button className="action-btn primary" onClick={() => setSelectedJob(job)}>View Job</button></div>
                  </article>)}
                </div>
              )}
            </section>

            <section className="recent-work-section"><div className="section-heading"><div><h2>Recent Work</h2><p>Your latest completed jobs</p></div><button className="text-link-btn" onClick={() => setActiveTab("history")}>View all →</button></div>
              <div className="recent-work-list">
                {historyJobs.slice(0, 3).map((job: any) => <div className="recent-work-row" key={job.id}><div className="recent-work-icon">✓</div><div className="recent-work-main"><strong>{job.service_id || "Completed Service"}</strong><span>{job.customers?.name || "Customer"}</span></div><div className="recent-work-rating">Completed</div><strong className="recent-work-amount">₹{job.price || 0}</strong></div>)}
                {historyJobs.length === 0 && <div className="recent-empty">No completed work yet.</div>}
              </div>
            </section>
          </div>
        )}

        {activeTab === "active" && <div className="worker-tab-panel fade-in">{activeJob ? <section className="active-job-card"><div className="active-job-status">ACTIVE JOB · {String(activeJob.status).toUpperCase()}</div><h2>{activeJob.service_id || "Accepted Job"}</h2><p className="active-job-customer">Customer: <strong>{activeJob.customers?.name || "Customer"}</strong></p><div className="active-job-details-grid"><div><span>Payment</span><strong>₹{activeJob.price || 0}</strong></div><div><span>Latitude</span><strong>{activeJob.customer_lat}</strong></div><div><span>Longitude</span><strong>{activeJob.customer_lng}</strong></div><div><span>Worker status</span><strong>Busy</strong></div></div><div className="active-job-map-note">Google Maps navigation was opened when this job was accepted.</div></section> : <div className="empty-active-job"><div className="empty-icon">📋</div><h2>No active job</h2><p>When you accept a job, its customer, payment and destination will appear here.</p><button className="action-btn primary" onClick={() => setActiveTab("jobs")}>Find Nearby Jobs</button></div>}</div>}

        {activeTab === "history" && <div className="worker-tab-panel fade-in"><section className="stats-row"><div className="worker-stat-card"><span>Total Jobs</span><strong>{completedJobs}</strong></div><div className="worker-stat-card"><span>Average Rating</span><strong>★ {rating || "New"}</strong></div><div className="worker-stat-card"><span>Hourly Rate</span><strong>₹{hourlyRate}</strong></div></section><section className="history-card"><div className="section-heading"><div><h2>Completed Work</h2><p>Your previous service jobs</p></div></div><div className="history-list">{historyJobs.length ? historyJobs.map((job: any) => <div className="history-row" key={job.id}><div className="history-icon">✓</div><div className="history-job-info"><strong>{job.service_id || "Completed Service"}</strong><span>{job.customers?.name || "Customer"}</span></div><span className="history-rating">Completed</span><strong>₹{job.price || 0}</strong><span className="completed-pill">Completed</span></div>) : <div className="recent-empty">No completed jobs yet.</div>}</div></section></div>}

        {activeTab === "payments" && <div className="worker-tab-panel fade-in"><section className="earnings-overview"><div className="earnings-card primary-earnings"><span>Total Recorded Payments</span><strong>₹{totalPayments}</strong><small>Linked to completed bookings</small></div><div className="earnings-card"><span>Completed Jobs</span><strong>{historyJobs.length}</strong><small>Loaded from Supabase</small></div><div className="earnings-card"><span>Current Rate</span><strong>₹{hourlyRate}</strong><small>Per hour</small></div></section><section className="history-card"><div className="section-heading"><div><h2>Payment History</h2><p>Recorded payments from completed bookings</p></div></div><div className="payment-table"><div className="payment-table-header"><span>Booking</span><span>Method</span><span>Amount</span><span>Status</span></div>{payments.length ? payments.map((payment: any) => <div className="payment-table-row" key={payment.id}><span>{String(payment.booking_id).slice(0, 8)}…</span><span>{payment.method || "—"}</span><strong>₹{payment.amount || 0}</strong><span className="paid-pill">{payment.status || "Recorded"}</span></div>) : <div className="recent-empty">No payments recorded yet.</div>}</div></section></div>}

        {activeTab === "profile" && <div className="worker-tab-panel fade-in"><section className="worker-profile-card"><div className="profile-hero"><div className="profile-large-avatar">{workerName.charAt(0).toUpperCase()}</div><div><h2>{workerName}</h2><p>{skill}</p><span>★ {rating || "New"} · {completedJobs} jobs completed</span></div></div><div className="profile-section"><h3>Personal Information</h3><div className="profile-grid"><div className="profile-field"><label>Full Name</label><div className="field-value">{workerName}</div></div><div className="profile-field"><label>Email</label><div className="field-value">{workerData?.email || "—"}</div></div><div className="profile-field"><label>Phone</label><div className="field-value">{workerData?.phone || "—"}</div></div><div className="profile-field"><label>Home Area</label><div className="field-value">{workerData?.home_address?.locality || workerData?.home_address?.district || "—"}</div></div></div></div><div className="profile-section"><h3>Professional Information</h3><div className="profile-grid"><div className="profile-field"><label>Skill Category</label><div className="field-value">{skill}</div></div><div className="profile-field"><label>Hourly Rate</label><div className="field-value">₹{hourlyRate}/hr</div></div><div className="profile-field"><label>UPI ID</label><div className="field-value">{worker?.upi_id || "Not provided"}</div></div><div className="profile-field"><label>eShram ID</label><div className="field-value">{worker?.eshram_id || "Not provided"}</div></div></div></div><div className="profile-actions"><button className="action-btn secondary">Edit Profile</button><button className="action-btn primary">Save Changes</button></div></section></div>}
      </main>

      {selectedJob && <div className="job-modal-overlay" onClick={() => setSelectedJob(null)}><div className="job-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedJob(null)}>×</button><div className="modal-job-icon">⚡</div><span className="modal-job-category">{selectedJob.category}</span><h2>{selectedJob.title}</h2><p className="modal-description">Request from {selectedJob.customer}. You are {selectedJob.distance_km} km away, with an estimated {selectedJob.eta_mins} minute drive.</p><div className="modal-detail-grid"><div><span>Customer</span><strong>{selectedJob.customer}</strong></div><div><span>Payment</span><strong>₹{selectedJob.price}</strong></div><div><span>Distance</span><strong>{selectedJob.distance_km} km</strong></div><div><span>ETA</span><strong>{selectedJob.eta_mins} min</strong></div><div><span>Latitude</span><strong>{selectedJob.lat.toFixed(5)}</strong></div><div><span>Longitude</span><strong>{selectedJob.lng.toFixed(5)}</strong></div></div><div className="modal-actions"><button className="action-btn secondary" disabled={respondingId === selectedJob.booking_id} onClick={() => respondToJob(selectedJob, "reject")}>Reject</button><button className="action-btn primary" disabled={respondingId === selectedJob.booking_id} onClick={() => respondToJob(selectedJob, "accept")}>{respondingId === selectedJob.booking_id ? "Processing..." : "Accept Job"}</button></div></div></div>}
    </div>
  );
}

export default WorkerDashboard;
