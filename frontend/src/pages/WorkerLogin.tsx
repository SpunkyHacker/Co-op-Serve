import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./WorkerLogin.css";

function WorkerLogin() {
  const navigate = useNavigate();

  // =========================================
  // LOGIN STATES
  // =========================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // =========================================
  // HANDLERS
  // =========================================
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
    } else if (data.session) {
      // Check user role if necessary, or simply navigate to the worker dashboard
      navigate("/worker-dashboard");
    }
  };

  return (
    <div className="worker-login-page">

      {/* ================================
          HEADER
      ================================= */}
      <header className="worker-login-header">
        <div className="worker-header-left">
          <Link to="/" className="worker-logo">
            Co-op Serve
          </Link>
          <span className="worker-owned-badge">
            <span className="worker-badge-check">✓</span>
            Worker-Owned
          </span>
        </div>
      </header>

      {/* ================================
          MAIN
      ================================= */}
      <main className="worker-login-main">

        {/* ================================
            LEFT SIDE
        ================================= */}
        <section className="worker-login-intro">
          <h1>WORKER LOGIN</h1>
          <h2>Co-op Serve</h2>
          <p className="worker-tagline">
            Verified workers. Fair pay. Trusted community.
          </p>

          <div className="worker-benefits">
            <div className="worker-benefit">
              <div className="worker-benefit-dot"></div>
              <div className="worker-benefit-content">
                <h3>100% Direct</h3>
                <p>Zero cuts. Revenue goes directly to member-workers.</p>
              </div>
            </div>

            <div className="worker-benefit">
              <div className="worker-benefit-dot"></div>
              <div className="worker-benefit-content">
                <h3>Fair Work</h3>
                <p>Find suitable local jobs with transparent pricing.</p>
              </div>
            </div>

            <div className="worker-benefit">
              <div className="worker-benefit-dot"></div>
              <div className="worker-benefit-content">
                <h3>Worker Owned</h3>
                <p>Be part of a cooperative built around worker dignity.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================
            LOGIN CARD
        ================================= */}
        <section className="worker-login-card">
          <div className="worker-secure-label">
            <span className="worker-lock-icon">🔒</span>
            SECURE LOGIN
          </div>

          <h2>Sign in</h2>
          <p className="worker-welcome">Welcome back to Co-op Serve</p>

          {/* ================================
              LOGIN FORM
          ================================= */}
          <form className="worker-login-form" onSubmit={handleLogin}>
            
            {/* EMAIL */}
            <div className="worker-field">
              <div className="worker-label-row">
                <label htmlFor="worker-email">
                  Email Address <span>*</span>
                </label>
              </div>
              <input
                id="worker-email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="worker-field">
              <label htmlFor="worker-password">
                Password <span>*</span>
              </label>
              <div className="worker-password-wrapper">
                <input
                  id="worker-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="worker-password-toggle"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "◉" : "◌"}
                </button>
              </div>
            </div>

            {/* REMEMBER / FORGOT */}
            <div className="worker-login-options">
              <label className="worker-remember">
                <input type="checkbox" name="remember" />
                <span>Remember this device</span>
              </label>
              <Link to="#" className="worker-forgot-password">
                Forgot password?
              </Link>
            </div>

            {/* ERROR MESSAGE DISPLAY */}
            {authError && (
              <div style={{ color: "#c44848", fontSize: "13px", marginBottom: "15px", fontWeight: 600 }}>
                {authError}
              </div>
            )}

            {/* SIGN IN */}
            <button
              type="submit"
              className="worker-signin-button"
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* ================================
              BOTTOM
          ================================= */}
          <div className="worker-login-bottom">
            <div className="worker-divider">
              <span></span>
              <strong>OR</strong>
              <span></span>
            </div>

            <p className="worker-register">
              New worker?{" "}
              <Link to="/worker-registration">Create an account</Link>
            </p>

            {/* CUSTOMER LOGIN */}
            <div className="worker-customer-box">
              <span>Are you looking for a service?</span>
              <Link to="/customer-login">
                Customer Login
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ================================
          FOOTER
      ================================= */}
      <footer className="worker-login-footer">
        <span>© 2026 Co-op Serve. • A Worker-Owned Cooperative Enterprise.</span>
      </footer>
    </div>
  );
}

export default WorkerLogin;