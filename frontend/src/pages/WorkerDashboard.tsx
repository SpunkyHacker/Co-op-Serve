import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function WorkerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      // 1. Verify Active Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // Redirect to login if no active session is found
        navigate("/worker-login");
        return;
      }

      setUserAuth(session.user);

      // 2. Fetch User & Worker Data from Database
      // This tests if your Postgres trigger successfully inserted the data
      const { data, error: dbError } = await supabase
        .from("users")
        .select(`
          name,
          phone,
          role,
          home_address,
          workers (
            gender,
            skill_category,
            eshram_id,
            upi_id,
            is_available
          )
        `)
        .eq("id", session.user.id)
        .single();

      if (dbError) {
        setError(dbError.message);
      } else {
        setWorkerProfile(data);
      }

      setLoading(false);
    };

    checkAuthAndFetchData();
  }, [navigate]);

  // =========================================
  // LOGOUT HANDLER
  // =========================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/worker-login");
  };

  // =========================================
  // LOADING STATE
  // =========================================
  if (loading) {
    return (
      <div style={styles.container}>
        <h2>Loading Dashboard...</h2>
      </div>
    );
  }

  // =========================================
  // MAIN RENDER
  // =========================================
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ color: "#006b63", margin: 0 }}>Co-op Serve</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </header>

      <main style={styles.main}>
        <h2>Worker Test Dashboard</h2>
        <p>If you are seeing this, your login routing is working perfectly.</p>

        {error && (
          <div style={styles.errorBox}>
            <strong>Database Error:</strong> {error}
          </div>
        )}

        {workerProfile && (
          <div style={styles.card}>
            <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
              Profile Data (From Database)
            </h3>
            
            <ul style={styles.list}>
              <li><strong>Auth Email:</strong> {userAuth?.email}</li>
              <li><strong>Full Name:</strong> {workerProfile.name}</li>
              <li><strong>Phone:</strong> {workerProfile.phone}</li>
              <li><strong>Role:</strong> {workerProfile.role}</li>
              <li>
                <strong>Location:</strong> {workerProfile.home_address?.locality}, {workerProfile.home_address?.district}
              </li>
            </ul>

            {workerProfile.workers && workerProfile.workers.length > 0 && (
              <>
                <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginTop: "20px" }}>
                  Worker Specifics
                </h3>
                <ul style={styles.list}>
                  <li><strong>Category:</strong> {workerProfile.workers[0].skill_category}</li>
                  <li><strong>Gender:</strong> {workerProfile.workers[0].gender}</li>
                  <li><strong>UPI ID:</strong> {workerProfile.workers[0].upi_id}</li>
                  <li><strong>eShram:</strong> {workerProfile.workers[0].eshram_id}</li>
                  <li>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: workerProfile.workers[0].is_available ? "green" : "red" }}>
                      {workerProfile.workers[0].is_available ? "Available" : "Not Available"}
                    </span>
                  </li>
                </ul>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Inline styles for quick testing without needing a dedicated CSS file
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#faf9f6",
    fontFamily: "Inter, sans-serif",
    color: "#10243b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 60px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e5e9ee",
  },
  logoutBtn: {
    padding: "10px 20px",
    backgroundColor: "#c44848",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  main: {
    maxWidth: "800px",
    margin: "40px auto",
    padding: "0 20px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 10px 28px rgba(16, 36, 59, 0.07)",
    marginTop: "20px",
  },
  list: {
    listStyleType: "none",
    padding: 0,
    lineHeight: "2.5",
  },
  errorBox: {
    padding: "15px",
    backgroundColor: "#ffebee",
    color: "#c44848",
    borderRadius: "6px",
    marginBottom: "20px",
  }
};

export default WorkerDashboard;