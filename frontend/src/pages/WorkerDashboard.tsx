import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./WorkerDashboard.css";
import { useTranslation } from "react-i18next";

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

interface Location {
  lat: number;
  lng: number;
}

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

function WorkerDashboard() {
  const navigate = useNavigate();
const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);

  // ==========================================================
  // DATABASE DATA
  // ==========================================================

  const [workerData, setWorkerData] = useState<any>(null);

  /*
   * IMPORTANT:
   * workerId = workers.id
   *
   * userId = users.id
   *
   * They are NOT the same thing.
   */
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const [activeTab, setActiveTab] = useState<Tab>("jobs");

  // ==========================================================
  // STATUS
  // ==========================================================

  const [status, setStatus] = useState<Status>("Available");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // ==========================================================
  // JOBS
  // ==========================================================

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");

  const [respondingId, setRespondingId] =
    useState<string | null>(null);

  const [completingJob, setCompletingJob] =
    useState(false);

  // ==========================================================
  // LOCATION
  // ==========================================================

  const [location, setLocation] =
    useState<Location | null>(null);

  const [locationError, setLocationError] =
    useState("");

  // ==========================================================
  // ACTIVE / HISTORY / PAYMENTS
  // ==========================================================

  const [activeJob, setActiveJob] =
    useState<any>(null);

  const [historyJobs, setHistoryJobs] =
    useState<any[]>([]);

  const [payments, setPayments] =
    useState<any[]>([]);

  // ==========================================================
  // PROFILE EDIT
  // ==========================================================

  const [isEditingProfile, setIsEditingProfile] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    skill_category: "",
    hourly_rate: 0,
    upi_id: "",
    service_radius_km: 15,
  });

  // ==========================================================
  // DERIVED DATABASE DATA
  // ==========================================================

  const worker =
    workerData?.workers;

  const workerName =
    workerData?.name || "Worker";

  const skill =
    worker?.skill_category || "Worker";

  const rating =
    Number(worker?.avg_rating || 0);

  const completedJobs =
    Number(worker?.total_jobs_completed || 0);

  const hourlyRate =
    Number(worker?.hourly_rate || 0);

  const serviceRadius =
    Number(worker?.service_radius_km ?? 15);

  // ==========================================================
  // LOAD JOBS
  // ==========================================================

  const loadJobs = useCallback(async () => {
    if (
      !workerId ||
      !location ||
      status !== "Available"
    ) {
      return;
    }

    setJobsLoading(true);
    setJobsError("");

    try {
      /*
       * DO NOT use localStorage radius.
       *
       * Backend reads service_radius_km directly
       * from Supabase.
       */

      const query = new URLSearchParams({
        worker_lat: String(location.lat),
        worker_lng: String(location.lng),
      });

      const response = await fetch(
        `${API_BASE}/api/workers/${workerId}/requests?${query}`
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.detail ||
          payload.message ||
          "Unable to load jobs."
        );
      }

      const mappedJobs: Job[] =
        (payload.requests || []).map(
          (item: any) => ({
            booking_id:
              item.booking_id,

            group_id:
              item.group_id,

            customer_id:
              item.customer_id,

            title:
              item.job_title ||
              item.service_id ||
              "Service Request",

            customer:
              item.customer_name ||
              "Customer",

            distance_km:
              Number(
                item.distance_km || 0
              ),

            eta_mins:
              Number(
                item.eta_mins || 0
              ),

            price:
              Number(
                item.price || 0
              ),

            category:
              payload.worker_skill ||
              skill,

            lat:
              Number(
                item.customer_lat
              ),

            lng:
              Number(
                item.customer_lng
              ),

            expires_at:
              item.expires_at,
          })
        );

      setJobs(mappedJobs);
    } catch (error: any) {
      console.error(
        "Job loading failed:",
        error
      );

      setJobsError(
        error.message ||
        "Unable to load nearby jobs."
      );
    } finally {
      setJobsLoading(false);
    }
  }, [
    workerId,
    location,
    status,
    skill,
  ]);

  // ==========================================================
  // LOAD ACTIVE JOB
  // ==========================================================

  const loadActiveJob =
    useCallback(async () => {
      if (!workerId) return;

      const { data, error } = await supabase
  .from("bookings")
  .select("id, group_id, customer_id, price, status, customer_lat, customer_lng, customers(users(name)), services(category)")
  .eq("worker_id", workerId)
  .in("status", ["accepted", "traveling", "working", "completed_pending_payment"])
  .order("id", { ascending: false })
  .limit(1)
  .maybeSingle();

if (!error) {
  // Handle both array and object responses safely to satisfy TypeScript
  const services = data?.services;
  const serviceData = Array.isArray(services) ? services[0] : services;
  
  setActiveJob(
    data ? { ...data, service_id: (serviceData as any)?.category || "Service Request" } : null
  );
}
    }, [workerId]);

  // ==========================================================
  // LOAD HISTORY + PAYMENTS
  // ==========================================================

  const loadHistory =
    useCallback(async () => {
      if (!workerId) return;

      const { data } = await supabase
  .from("bookings")
  .select("id, price, status, customer_id, customers(users(name)), services(category)")
  .eq("worker_id", workerId)
  .eq("status", "completed")
  .order("id", { ascending: false })
  .limit(50);

const history = (data || []).map((row: any) => {
  // Handle both array and object responses safely to satisfy TypeScript
  const serviceData = Array.isArray(row.services) ? row.services[0] : row.services;
  
  return {
    ...row,
    service_id: (serviceData as any)?.category || "Completed Service"
  };
});

setHistoryJobs(history);

      const bookingIds =
        history.map(
          (row: any) =>
            row.id
        );

      if (!bookingIds.length) {
        setPayments([]);
        return;
      }

      const {
        data: paymentRows,
      } = await supabase
        .from("payments")
        .select("*")
        .in(
          "booking_id",
          bookingIds
        )
        .order(
          "booking_id",
          {
            ascending: false,
          }
        );

      setPayments(
        paymentRows || []
      );
    }, [workerId]);

  // ==========================================================
  // INITIALIZE DASHBOARD
  // ==========================================================

  useEffect(() => {
    let alive = true;

    const init =
      async () => {
        try {
          const {
            data: {
              session,
            },
          } =
            await supabase.auth.getSession();

          if (!session) {
            navigate(
              "/worker-login"
            );
            return;
          }

          /*
           * IMPORTANT:
           *
           * session.user.id
           *       ↓
           * users.id
           *       ↓
           * workers.user_id
           *
           * We are NOT searching workers.id
           * using the auth user ID.
           */

          const {
            data,
            error,
          } =
            await supabase
              .from("users")
              .select(
                `
                id,
                name,
                email,
                phone,
                role,
                home_address,

                workers (
                  id,
                  user_id,
                  gender,
                  skill_category,
                  eshram_id,
                  upi_id,
                  hourly_rate,
                  avg_rating,
                  total_jobs_completed,
                  is_available,
                  location_lat,
                  location_lng,
                  service_radius_km
                )
                `
              )
              .eq(
                "id",
                session.user.id
              )
              .maybeSingle();

          if (!alive) return;

          if (error) {
            console.error(
              "Worker profile error:",
              error
            );

            alert(
              "Could not load your worker profile."
            );

            setLoading(false);
            return;
          }

          if (!data) {
            alert(
              "Your user account was not found."
            );

            setLoading(false);
            return;
          }

          // Guard against a leftover/stale session from the customer
          // portal (shared browser storage, direct URL visit, etc.)
          // rendering a customer's account inside the worker dashboard.
          if (data.role !== "worker") {
            await supabase.auth.signOut();
            navigate("/worker-login");
            return;
          }

          // `workers` is embedded via a to-one relation (one worker row per
          // user), so at runtime this is a single object - but Supabase's
          // generated types can't always prove that and infer it as an
          // array instead. Cast it explicitly to match the real shape.
          const currentWorker: any =
            data.workers;

          if (!currentWorker) {
            alert(
              "Worker record was not found for this user."
            );

            await supabase.auth.signOut();
            navigate("/worker-login");
            return;
          }

          /*
           * SAVE BOTH IDs SEPARATELY
           */

          setUserId(
            data.id
          );

          setWorkerId(
            currentWorker.id
          );

          setWorkerData(
            data
          );

          /*
           * DATABASE IS THE SOURCE OF TRUTH
           */

          setStatus(
            currentWorker.is_available === false
              ? "Busy"
              : "Available"
          );

          /*
           * service_radius_km comes directly
           * from workers table.
           */

          setEditForm({
            name:
              data.name || "",

            phone:
              data.phone || "",

            skill_category:
              currentWorker.skill_category ||
              "",

            hourly_rate:
              Number(
                currentWorker.hourly_rate || 0
              ),

            upi_id:
              currentWorker.upi_id ||
              "",

            service_radius_km:
              Number(
                currentWorker.service_radius_km ??
                15
              ),
          });

          if (
            currentWorker.location_lat != null &&
            currentWorker.location_lng != null
          ) {
            setLocation({
              lat:
                Number(
                  currentWorker.location_lat
                ),

              lng:
                Number(
                  currentWorker.location_lng
                ),
            });
          }
        } catch (error) {
          console.error(
            "Dashboard initialization failed:",
            error
          );

          alert(
            "Unable to load worker dashboard."
          );
        } finally {
          if (alive) {
            setLoading(false);
          }
        }
      };

    init();

    return () => {
      alive = false;
    };
  }, [navigate]);

  // ==========================================================
  // LOAD ACTIVE + HISTORY
  // ==========================================================

  useEffect(() => {
    if (!workerId) return;

    loadActiveJob();
    loadHistory();
  }, [
    workerId,
    loadActiveJob,
    loadHistory,
  ]);

  // ==========================================================
  // LOAD NEARBY JOBS
  // ==========================================================

  useEffect(() => {
    if (
      !workerId ||
      !location ||
      status !== "Available"
    ) {
      return;
    }

    loadJobs();

    const interval =
      window.setInterval(
        loadJobs,
        10000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [
    loadJobs,
    workerId,
    location,
    status,
  ]);

  // ==========================================================
  // GPS LOCATION
  // ==========================================================

  useEffect(() => {
    if (!workerId) return;

    if (!("geolocation" in navigator)) {
      setLocationError(
        "This browser does not support GPS location."
      );
      return;
    }

    const watchId =
      navigator.geolocation.watchPosition(
        async (position) => {
          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          setLocation({
            lat,
            lng,
          });

          setLocationError("");

          try {
            await fetch(
              `${API_BASE}/api/workers/update-location`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  worker_id:
                    workerId,

                  lat,
                  lng,
                }),
              }
            );
          } catch (error) {
            console.error(
              "Location update failed:",
              error
            );
          }
        },

        (error) => {
          console.error(
            "GPS error:",
            error
          );

          setLocationError(
            "Allow location access to find nearby jobs."
          );
        },

        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      );

    return () =>
      navigator.geolocation.clearWatch(
        watchId
      );
  }, [workerId]);

  // ==========================================================
  // CHANGE AVAILABILITY
  // ==========================================================

  const setAvailability =
    async (
      available: boolean
    ) => {
      if (!workerId) {
        alert(
          "Worker record was not loaded."
        );
        return;
      }

      if (statusSaving) return;

      setStatusSaving(true);

      try {
        const response =
          await fetch(
            `${API_BASE}/api/workers/availability`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                worker_id:
                  workerId,

                is_available:
                  available,
              }),
            }
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload.detail ||
            payload.message ||
            "Unable to change availability."
          );
        }

        /*
         * Backend successfully updated
         * workers.is_available.
         */

        setStatus(
          available
            ? "Available"
            : "Busy"
        );

        setStatusMenuOpen(
          false
        );

        if (!available) {
          setJobs([]);
        }

        /*
         * Update local database-backed state.
         */

        setWorkerData(
          (current: any) => {
            if (!current) return current;

            return {
              ...current,

              workers: current.workers
                ? {
                    ...current.workers,
                    is_available: available,
                  }
                : current.workers,
            };
          }
        );
      } catch (error: any) {
        console.error(
          "Availability update failed:",
          error
        );

        alert(
          `Could not update availability.\n\n${error.message}`
        );
      } finally {
        setStatusSaving(false);
      }
    };

    const statusDisplayMap: Record<Status, string> = {
    "Available": t('workerDashboard.sidebar.status.available'),
    "Busy": t('workerDashboard.sidebar.sidebar.status.busy'),
    "Do not disturb": t('workerDashboard.sidebar.status.dnd'),
    "Appear offline": t('workerDashboard.sidebar.status.offline')
  };
  // ==========================================================
  // STATUS MENU
  // ==========================================================

  const selectStatus =
    (next: Status) => {
      /*
       * Your database currently has a boolean:
       *
       * is_available
       *
       * Therefore:
       *
       * Available = true
       * Everything else = false
       */

      if (
        next === "Available"
      ) {
        setAvailability(true);
      } else {
        setAvailability(false);
      }
    };

  // ==========================================================
  // EDIT PROFILE
  // ==========================================================

  const handleEditClick =
    () => {
      if (!worker || !workerData) {
        alert(
          "Worker information is not loaded."
        );
        return;
      }

      setEditForm({
        name:
          workerData.name || "",

        phone:
          workerData.phone || "",

        skill_category:
          worker.skill_category ||
          "",

        hourly_rate:
          Number(
            worker.hourly_rate || 0
          ),

        upi_id:
          worker.upi_id || "",

        service_radius_km:
          Number(
            worker.service_radius_km ??
            15
          ),
      });

      setIsEditingProfile(
        true
      );
    };

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSaveProfile =
    async () => {
      if (!workerId) {
        alert(
          "Worker ID was not found."
        );
        return;
      }

      if (!userId) {
        alert(
          "User ID was not found."
        );
        return;
      }

      if (!worker) {
        alert(
          "Worker information is not loaded."
        );
        return;
      }

      if (
        !editForm.name.trim()
      ) {
        alert(
          "Name cannot be empty."
        );
        return;
      }

      if (
        !editForm.phone.trim()
      ) {
        alert(
          "Phone cannot be empty."
        );
        return;
      }

      if (
        editForm.hourly_rate < 0
      ) {
        alert(
          "Hourly rate cannot be negative."
        );
        return;
      }

      if (
        editForm.service_radius_km < 1 ||
        editForm.service_radius_km > 100
      ) {
        alert(
          "Service radius must be between 1 and 100 km."
        );
        return;
      }

      setSavingProfile(
        true
      );

      try {
        /*
         * SEND:
         *
         * worker_id = workers.id
         *
         * user_id = users.id
         */

        const response =
          await fetch(
            `${API_BASE}/api/workers/profile`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                worker_id:
                  workerId,

                user_id:
                  userId,

                name:
                  editForm.name.trim(),

                phone:
                  editForm.phone.trim(),

                skill_category:
                  editForm.skill_category.trim(),

                hourly_rate:
                  Number(
                    editForm.hourly_rate
                  ),

                upi_id:
                  editForm.upi_id.trim() ||
                  null,

                service_radius_km:
                  Number(
                    editForm.service_radius_km
                  ),
              }),
            }
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload.detail ||
            payload.message ||
            "Profile update failed."
          );
        }

        /*
         * Update React state so the UI
         * immediately reflects database.
         */

        setWorkerData(
          (current: any) => {
            if (!current) return current;

            return {
              ...current,

              name:
                editForm.name.trim(),

              phone:
                editForm.phone.trim(),

              workers:
                current.workers &&
                current.workers.id === workerId
                  ? {
                      ...current.workers,

                      skill_category:
                        editForm.skill_category.trim(),

                      hourly_rate:
                        Number(
                          editForm.hourly_rate
                        ),

                      upi_id:
                        editForm.upi_id.trim() ||
                        null,

                      service_radius_km:
                        Number(
                          editForm.service_radius_km
                        ),
                    }
                  : current.workers,
            };
          }
        );

        setIsEditingProfile(
          false
        );

        alert(
          "Profile updated successfully."
        );
      } catch (error: any) {
        console.error(
          "Profile update failed:",
          error
        );

        alert(
          `Could not save profile.\n\n${error.message}`
        );
      } finally {
        setSavingProfile(
          false
        );
      }
    };

  // ==========================================================
  // RESPOND TO JOB
  // ==========================================================

  const respondToJob =
    async (
      job: Job,
      action: "accept" | "reject"
    ) => {
      if (!workerId) {
        alert(
          "Worker record was not loaded."
        );
        return;
      }

      setRespondingId(
        job.booking_id
      );

      try {
        const response =
          await fetch(
            `${API_BASE}/api/bookings/respond`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                booking_id:
                  job.booking_id,

                worker_id:
                  workerId,

                group_id:
                  job.group_id,

                action,
              }),
            }
          );

        const payload =
          await response.json();

        if (
          !response.ok ||
          payload.status ===
            "failed"
        ) {
          throw new Error(
            payload.message ||
            payload.detail ||
            "Unable to process job."
          );
        }

        setJobs(
          (current) =>
            current.filter(
              (item) =>
                item.booking_id !==
                job.booking_id
            )
        );

        if (
          action === "accept"
        ) {
          /*
           * Accepting a job makes worker unavailable.
           * Update database through backend.
           */

          setStatus(
            "Busy"
          );

          setWorkerData(
            (current: any) => {
              if (!current)
                return current;

              return {
                ...current,

                workers: current.workers
                  ? {
                      ...current.workers,
                      is_available: false,
                    }
                  : current.workers,
              };
            }
          );

          setActiveJob({
            id:
              job.booking_id,

            group_id:
              job.group_id,

            customer_id:
              job.customer_id,

            service_id:
              job.title,

            price:
              job.price,

            status:
              "accepted",

            customer_lat:
              job.lat,

            customer_lng:
              job.lng,

            customers: {
              name:
                job.customer,
            },
          });

          setActiveTab(
            "active"
          );

          if (
            payload.navigation_url
          ) {
            window.open(
              payload.navigation_url,
              "_blank",
              "noopener,noreferrer"
            );
          }
        }
      } catch (error: any) {
        console.error(
          "Job response failed:",
          error
        );

        alert(
          error.message ||
          "Unable to process job."
        );
      } finally {
        setRespondingId(
          null
        );
      }
    };

  // ==========================================================
  // MARK ACTIVE JOB AS DONE (hands off to customer for payment)
  // ==========================================================

  const markJobComplete =
    async () => {
      if (!activeJob) return;

      setCompletingJob(true);

      try {
        const response = await fetch(
          `${API_BASE}/api/bookings/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              booking_id: activeJob.id,
              status: "completed_pending_payment",
            }),
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.detail ||
            payload.message ||
            "Unable to mark job complete."
          );
        }

        setActiveJob((current: any) =>
          current
            ? { ...current, status: "completed_pending_payment" }
            : current
        );
      } catch (error: any) {
        console.error(
          "Marking job complete failed:",
          error
        );

        alert(
          error.message ||
          "Unable to mark job complete."
        );
      } finally {
        setCompletingJob(false);
      }
    };

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  const handleSignOut =
    async () => {
      await supabase.auth.signOut();
      navigate(
        "/worker-login"
      );
    };

  // ==========================================================
  // PAYMENT TOTAL
  // ==========================================================

  const totalPayments =
    payments.reduce(
      (
        sum,
        row
      ) =>
        sum +
        Number(
          row.amount || 0
        ),
      0
    );

  const statusClass =
    status
      .toLowerCase()
      .replaceAll(
        " ",
        "-"
      );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="worker-dashboard-loading">
        <div className="spinner"></div>
        <p>
          Loading your dashboard...
        </p>
      </div>
    );
  }

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (
    <div className="worker-dashboard-layout">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="worker-sidebar">
        <div className="worker-sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="worker-brand-logo">CS</div>
            <span>{t('workerDashboard.sidebar.brand')}</span>
          </div>
          
  {/* LANGUAGE TOGGLE */}
          <select 
            value={i18n.language} 
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{ 
              padding: '6px', 
              borderRadius: '6px', 
              background: '#1e293b', 
              color: '#fff', 
              border: '1px solid #475569',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <option value="en" style={{ background: '#1e293b', color: '#fff' }}>EN</option>
            <option value="ta" style={{ background: '#1e293b', color: '#fff' }}>TA</option>
            <option value="hi" style={{ background: '#1e293b', color: '#fff' }}>HI</option>
          </select>
        </div>

        <div className="worker-sidebar-account">
          <div className="worker-mini-profile">
            <div className="worker-mini-avatar">{workerName.charAt(0).toUpperCase()}</div>
            <div className="worker-user-info">
              <strong>{workerName}</strong>
              <span>{skill}</span>
            </div>
          </div>

          <div className="worker-status-wrapper">
            <button
              className={`worker-current-status ${statusClass}`}
              onClick={() => setStatusMenuOpen((value) => !value)}
              disabled={statusSaving}
            >
              <span className="status-dot"></span>
              <span>{statusSaving ? t('workerDashboard.sidebar.status.saving') : statusDisplayMap[status]}</span>
              <span className="status-chevron">▼</span>
            </button>

            {statusMenuOpen && (
              <div className="worker-status-menu">
                {(["Available", "Busy", "Do not disturb", "Appear offline"] as Status[]).map((item) => (
                  <button key={item} className="worker-status-option" onClick={() => selectStatus(item)}>
                    <span className={`status-option-dot ${item.toLowerCase().replaceAll(" ", "-")}`} />
                    <span>{statusDisplayMap[item]}</span>
                    {status === item && <span className="status-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="worker-logout-btn" onClick={handleSignOut}>
            {t('workerDashboard.sidebar.signOut')}
          </button>
        </div>

        <nav className="worker-sidebar-nav">
          {[
            ["jobs", "🔎", t('workerDashboard.sidebar.tabs.jobs')],
            ["active", "📋", t('workerDashboard.sidebar.tabs.active')],
            ["history", "📜", t('workerDashboard.sidebar.tabs.history')],
            ["payments", "💰", t('workerDashboard.sidebar.tabs.payments')],
            ["profile", "👤", t('workerDashboard.sidebar.tabs.profile')],
          ].map(([tab, icon, label]) => (
            <button key={tab} className={`worker-nav-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab as Tab)}>
              <span className="worker-nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="worker-main-content">

        <header className="worker-content-header">
          <div>
            <h1>
              {activeTab === "jobs" && t('workerDashboard.header.greeting', { name: workerName })}
              {activeTab === "active" && t('workerDashboard.header.myJobs')}
              {activeTab === "history" && t('workerDashboard.header.workHistory')}
              {activeTab === "payments" && t('workerDashboard.header.paymentHistory')}
              {activeTab === "profile" && t('workerDashboard.header.manageProfile')}
            </h1>

            {activeTab === "jobs" && (
              <p>
                {status === "Available"
                  ? t('workerDashboard.header.availableText', { skill: String(skill).toLowerCase() })
                  : t('workerDashboard.header.pausedText')}
              </p>
            )}
          </div>
        </header>

        {/* ===================================================
            FIND JOBS
        =================================================== */}
        {activeTab === "jobs" && (
          <div className="worker-tab-panel fade-in">
            <section className="worker-availability-banner">
              <div className="availability-banner-left">
                <div className={`large-status-dot ${statusClass}`} />
                <div>
                  <strong>{statusDisplayMap[status]}</strong>
                  <span>
                    {status === "Available"
                      ? t('workerDashboard.jobsTab.receivingAlerts')
                      : t('workerDashboard.jobsTab.alertsPaused')}
                  </span>
                </div>
              </div>
              <button className="availability-manage-btn" onClick={() => setStatusMenuOpen(true)}>
                {t('workerDashboard.jobsTab.changeStatus')}
              </button>
            </section>

            {locationError && (
              <div className="worker-location-warning">
                <strong>{t('workerDashboard.jobsTab.location')}</strong> {locationError}
              </div>
            )}

            {jobsError && (
              <div className="worker-location-warning">
                <strong>{t('workerDashboard.jobsTab.jobs')}</strong> {jobsError}
              </div>
            )}

            <section className="nearby-jobs-section">
              <div className="jobs-heading">
                <div>
                  <h2>{t('workerDashboard.jobsTab.nearbyJobs')}</h2>
                  <p>
                    {jobsLoading
                      ? t('workerDashboard.jobsTab.checking')
                      : location
                      ? t('workerDashboard.jobsTab.matchingJobs', { count: jobs.length, radius: serviceRadius })
                      : t('workerDashboard.jobsTab.waitingLocation')}
                  </p>
                </div>
                <span className="radius-pill">{serviceRadius} km</span>
              </div>

              {jobs.length > 0 ? (
                <div className="worker-jobs-list">
                  {jobs.map((job) => (
                    <div className="job-request-card" key={job.booking_id}>
                      <h3 className="job-request-title">{job.title}</h3>
                      <div className="job-request-details">
                        <div className="job-detail-box">
                          <small>{t('workerDashboard.jobsTab.customer')}</small>
                          <strong>{job.customer}</strong>
                        </div>
                        <div className="job-detail-box">
                          <small>{t('workerDashboard.jobsTab.price')}</small>
                          <strong>₹{job.price}</strong>
                        </div>
                        <div className="job-detail-box">
                          <small>{t('workerDashboard.jobsTab.distance')}</small>
                          <strong>{job.distance_km} km</strong>
                        </div>
                      </div>
                      <div className="job-request-actions">
                        <button
                          className="action-btn secondary"
                          disabled={respondingId === job.booking_id}
                          onClick={() => respondToJob(job, "reject")}
                        >
                          {t('workerDashboard.jobsTab.reject')}
                        </button>
                        <button
                          className="action-btn primary"
                          disabled={respondingId === job.booking_id}
                          onClick={() => respondToJob(job, "accept")}
                        >
                          {respondingId === job.booking_id ? t('workerDashboard.jobsTab.processing') : t('workerDashboard.jobsTab.approve')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="recent-empty">
                  <div className="empty-icon">🔎</div>
                  <h3>{t('workerDashboard.jobsTab.noMatching')}</h3>
                  <p>
                    {status === "Available"
                      ? t('workerDashboard.jobsTab.checkAgain', { radius: serviceRadius })
                      : t('workerDashboard.jobsTab.changeToAvailable')}
                  </p>
                </div>
              )}
            </section>

            {/* RECENT WORK */}
            <section className="recent-work-section">
              <div className="section-heading">
                <div>
                  <h2>{t('workerDashboard.jobsTab.recentWork')}</h2>
                  <p>{t('workerDashboard.jobsTab.latestCompleted')}</p>
                </div>
                <button className="text-link-btn" onClick={() => setActiveTab("history")}>
                  {t('workerDashboard.jobsTab.viewAll')}
                </button>
              </div>

              <div className="recent-work-list">
                {historyJobs.length > 0 ? (
                  historyJobs.slice(0, 5).map((job: any) => (
                    <div className="recent-work-row" key={job.id}>
                      <div className="recent-work-icon">✓</div>
                      <div className="recent-work-main">
                        <strong>{job.service_id || t('workerDashboard.jobsTab.completedService')}</strong>
                        <span>{job.customers?.users?.name || t('workerDashboard.jobsTab.customer')}</span>
                      </div>
                      <span className="completed-pill">{t('workerDashboard.jobsTab.completed')}</span>
                      <strong>₹{job.price || 0}</strong>
                    </div>
                  ))
                ) : (
                  <div className="recent-empty">{t('workerDashboard.jobsTab.noCompletedWork')}</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            ACTIVE JOB
        =================================================== */}
        {activeTab === "active" && (
          <div className="worker-tab-panel fade-in">
            {activeJob ? (
              <section className="active-job-card">
                <div className="section-heading">
                  <div>
                    <h2>{t('workerDashboard.activeTab.title')}</h2>
                    <p>{t('workerDashboard.activeTab.subtitle')}</p>
                  </div>
                  <span className="active-pill">{activeJob.status}</span>
                </div>

                <div className="active-job-details-grid">
                  <div>
                    <span>{t('workerDashboard.jobsTab.customer')}</span>
                    <strong>{activeJob.customers?.users?.name || t('workerDashboard.jobsTab.customer')}</strong>
                  </div>
                  <div>
                    <span>{t('workerDashboard.activeTab.payment')}</span>
                    <strong>₹{activeJob.price || 0}</strong>
                  </div>
                  <div>
                    <span>{t('workerDashboard.activeTab.service')}</span>
                    <strong>{activeJob.service_id}</strong>
                  </div>
                  <div>
                    <span>{t('workerDashboard.activeTab.status')}</span>
                    <strong>{activeJob.status}</strong>
                  </div>
                </div>

                {activeJob.status === "completed_pending_payment" ? (
                  <p className="active-job-note">{t('workerDashboard.activeTab.markedDone')}</p>
                ) : (
                  <>
                    <p className="active-job-note">{t('workerDashboard.activeTab.destNote')}</p>
                    <div className="active-job-actions">
                      {activeJob.customer_lat && activeJob.customer_lng && (
                        <a
                          className="action-btn secondary"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.customer_lat},${activeJob.customer_lng}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('workerDashboard.activeTab.openNav')}
                        </a>
                      )}
                      <button
                        className="action-btn primary"
                        disabled={completingJob}
                        onClick={markJobComplete}
                      >
                        {completingJob ? t('workerDashboard.activeTab.marking') : t('workerDashboard.activeTab.markComplete')}
                      </button>
                    </div>
                  </>
                )}
              </section>
            ) : (
              <div className="recent-empty">
                <div className="empty-icon">⚡</div>
                <h3>{t('workerDashboard.activeTab.noActive')}</h3>
                <p>{t('workerDashboard.activeTab.acceptNearby')}</p>
                <button className="action-btn primary" onClick={() => setActiveTab("jobs")}>
                  {t('workerDashboard.activeTab.findNearby')}
                </button>
              </div>
            )}
          </div>
        )}
        {/* ===================================================
            HISTORY
        =================================================== */}
        {activeTab === "history" && (
          <div className="worker-tab-panel fade-in">
            <section className="stats-row">
              <div className="worker-stat-card">
                <span>{t('workerDashboard.historyTab.totalJobs')}</span>
                <strong>{completedJobs}</strong>
              </div>
              <div className="worker-stat-card">
                <span>{t('workerDashboard.historyTab.avgRating')}</span>
                <strong>★ {rating || t('workerDashboard.historyTab.new')}</strong>
              </div>
              <div className="worker-stat-card">
                <span>{t('workerDashboard.historyTab.hourlyRate')}</span>
                <strong>₹{hourlyRate}</strong>
              </div>
            </section>

            <section className="history-card">
              <div className="section-heading">
                <div>
                  <h2>{t('workerDashboard.historyTab.completedWork')}</h2>
                  <p>{t('workerDashboard.historyTab.prevJobs')}</p>
                </div>
              </div>

              <div className="history-list">
                {historyJobs.length > 0 ? (
                  historyJobs.map((job: any) => (
                    <div className="history-row" key={job.id}>
                      <div className="history-icon">✓</div>
                      <div className="history-job-info">
                        <strong>{job.service_id || t('workerDashboard.jobsTab.completedService')}</strong>
                        <span>{job.customers?.users?.name || t('workerDashboard.jobsTab.customer')}</span>
                      </div>
                      <span className="history-rating">{t('workerDashboard.jobsTab.completed')}</span>
                      <strong>₹{job.price || 0}</strong>
                      <span className="completed-pill">{t('workerDashboard.jobsTab.completed')}</span>
                    </div>
                  ))
                ) : (
                  <div className="recent-empty">{t('workerDashboard.historyTab.noCompleted')}</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            PAYMENTS
        =================================================== */}
        {activeTab === "payments" && (
          <div className="worker-tab-panel fade-in">
            <section className="earnings-overview">
              <div className="earnings-card primary-earnings">
                <span>{t('workerDashboard.paymentsTab.totalRecorded')}</span>
                <strong>₹{totalPayments}</strong>
                <small>{t('workerDashboard.paymentsTab.linkedCompleted')}</small>
              </div>
              <div className="earnings-card">
                <span>{t('workerDashboard.paymentsTab.completedJobs')}</span>
                <strong>{historyJobs.length}</strong>
                <small>{t('workerDashboard.paymentsTab.loadedSupabase')}</small>
              </div>
              <div className="earnings-card">
                <span>{t('workerDashboard.paymentsTab.currentRate')}</span>
                <strong>₹{hourlyRate}</strong>
                <small>{t('workerDashboard.paymentsTab.perHour')}</small>
              </div>
            </section>

            <section className="history-card">
              <div className="section-heading">
                <div>
                  <h2>{t('workerDashboard.paymentsTab.paymentHistory')}</h2>
                  <p>{t('workerDashboard.paymentsTab.recordedPayments')}</p>
                </div>
              </div>

              <div className="payment-table">
                <div className="payment-table-header">
                  <span>{t('workerDashboard.paymentsTab.booking')}</span>
                  <span>{t('workerDashboard.paymentsTab.method')}</span>
                  <span>{t('workerDashboard.paymentsTab.amount')}</span>
                  <span>{t('workerDashboard.activeTab.status')}</span>
                </div>

                {payments.length > 0 ? (
                  payments.map((payment: any) => (
                    <div className="payment-table-row" key={payment.id}>
                      <span>{String(payment.booking_id).slice(0, 8)}…</span>
                      <span>{payment.method || "—"}</span>
                      <strong>₹{payment.amount || 0}</strong>
                      <span className="paid-pill">{payment.status || t('workerDashboard.paymentsTab.recorded')}</span>
                    </div>
                  ))
                ) : (
                  <div className="recent-empty">{t('workerDashboard.paymentsTab.noPayments')}</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            PROFILE
        =================================================== */}
        {activeTab === "profile" && (
          <div className="worker-tab-panel fade-in">
            <section className="worker-profile-card">
              <div className="profile-hero">
                <div className="profile-large-avatar">
                  {workerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2>{workerName}</h2>
                  <p>{skill}</p>
                  <span>
                    ★ {rating || t('workerDashboard.historyTab.new')} · {completedJobs} {t('workerDashboard.profileTab.jobsCompleted')}
                  </span>
                </div>
              </div>

              {/* PERSONAL */}
              <div className="profile-section">
                <h3>{t('workerDashboard.profileTab.personalInfo')}</h3>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.fullName')}</label>
                    {isEditingProfile ? (
                      <input
                        className="edit-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    ) : (
                      <div className="field-value">{workerName}</div>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.email')}</label>
                    <div className="field-value">{workerData?.email || "—"}</div>
                  </div>
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.phone')}</label>
                    {isEditingProfile ? (
                      <input
                        className="edit-input"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    ) : (
                      <div className="field-value">{workerData?.phone || "—"}</div>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.homeArea')}</label>
                    <div className="field-value">
                      {workerData?.home_address?.locality || workerData?.home_address?.district || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* PROFESSIONAL */}
              <div className="profile-section">
                <h3>{t('workerDashboard.profileTab.profInfo')}</h3>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.skillCategory')}</label>
                    {isEditingProfile ? (
                      <input
                        className="edit-input"
                        value={editForm.skill_category}
                        onChange={(e) => setEditForm({ ...editForm, skill_category: e.target.value })}
                      />
                    ) : (
                      <div className="field-value">{skill}</div>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.hourlyRate')}</label>
                    {isEditingProfile ? (
                      <input
                        type="number"
                        min="0"
                        className="edit-input"
                        value={editForm.hourly_rate}
                        onChange={(e) => setEditForm({ ...editForm, hourly_rate: Number(e.target.value) })}
                      />
                    ) : (
                      <div className="field-value">₹{hourlyRate}/hr</div>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.upiId')}</label>
                    {isEditingProfile ? (
                      <input
                        className="edit-input"
                        value={editForm.upi_id}
                        onChange={(e) => setEditForm({ ...editForm, upi_id: e.target.value })}
                      />
                    ) : (
                      <div className="field-value">{worker?.upi_id || t('workerDashboard.profileTab.notProvided')}</div>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>{t('workerDashboard.profileTab.serviceRadius')}</label>
                    {isEditingProfile ? (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="edit-input"
                        value={editForm.service_radius_km}
                        onChange={(e) => setEditForm({ ...editForm, service_radius_km: Number(e.target.value) })}
                      />
                    ) : (
                      <div className="field-value radius-value">
                        <strong>{serviceRadius} km</strong>
                        <span>{t('workerDashboard.profileTab.usedForMatching')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SERVICE / LOCATION */}
              <div className="profile-section">
                <h3>{t('workerDashboard.profileTab.serviceLocation')}</h3>
                <div className="profile-location-grid">
                  <div className="location-info-card">
                    <span>{t('workerDashboard.profileTab.currentLocation')}</span>
                    <strong>
                      {location
                        ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                        : t('workerDashboard.profileTab.locUnavailable')}
                    </strong>
                  </div>
                  <div className="location-info-card">
                    <span>{t('workerDashboard.profileTab.jobMatchingRadius')}</span>
                    <strong>{serviceRadius} km</strong>
                  </div>
                  <div className="location-info-card">
                    <span>{t('workerDashboard.profileTab.jobAlerts')}</span>
                    <strong className={status === "Available" ? "text-success" : "text-danger"}>
                      {status === "Available" ? t('workerDashboard.profileTab.enabled') : t('workerDashboard.profileTab.disabled')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="profile-actions">
                {isEditingProfile ? (
                  <>
                    <button
                      className="action-btn secondary"
                      disabled={savingProfile}
                      onClick={() => setIsEditingProfile(false)}
                    >
                      {t('workerDashboard.profileTab.cancel')}
                    </button>
                    <button
                      className="action-btn primary"
                      disabled={savingProfile}
                      onClick={handleSaveProfile}
                    >
                      {savingProfile ? t('workerDashboard.profileTab.saving') : t('workerDashboard.profileTab.saveChanges')}
                    </button>
                  </>
                ) : (
                  <button className="action-btn primary" onClick={handleEditClick}>
                    {t('workerDashboard.profileTab.editProfile')}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>


    </div>
  );
}

export default WorkerDashboard;