import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function CustomerDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      // Retrieve the current session from the browser
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // No active session found, redirect to login
        navigate("/customer-login");
      } else {
        // Extract the name from the user's raw metadata
        const metadata = session.user.user_metadata;
        const firstName = metadata.first_name || "Customer";
        const lastName = metadata.last_name || "";
        
        setUserName(`${firstName} ${lastName}`.trim());
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customer-login");
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Welcome back, {userName}!</h1>
      <p>You are successfully logged in to Co-op Serve.</p>
      
      <button 
        onClick={handleLogout}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Log Out
      </button>
    </div>
  );
}

export default CustomerDashboard;