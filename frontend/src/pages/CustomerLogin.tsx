import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";

import "./CustomerLogin.css";

function CustomerLogin() {
  const navigate = useNavigate();

  // =========================================
  // STATE
  // =========================================

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // =========================================
  // LOGIN
  // =========================================

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // -----------------------------------------
    // TEMPORARY FRONTEND LOGIN
    // -----------------------------------------
    // Later, replace this with your backend
    // authentication logic.
    //
    // For now, if both fields contain something,
    // the customer is considered logged in.
    // -----------------------------------------

    if (!username.trim() || !password.trim()) {
      return;
    }

    // Successful customer login
    navigate("/user-dashboard");
  };

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="customer-login-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="customer-login-header">

        <div className="customer-header-left">

          <Link
            to="/"
            className="customer-logo"
          >
            <span className="customer-logo-icon">
              CS
            </span>

            <span>
              Co-op Serve
            </span>
          </Link>

          <span className="customer-owned-badge">

            <span className="customer-badge-check">
              ✓
            </span>

            Worker-Owned

          </span>

        </div>

      </header>


      {/* =========================================
          MAIN
      ========================================= */}

      <main className="customer-login-main">

        {/* =========================================
            LEFT INTRODUCTION
        ========================================= */}

        <section className="customer-login-intro">

          <h1>
            CUSTOMER LOGIN
          </h1>

          <h2>
            Co-op Serve
          </h2>

          <p className="customer-tagline">
            Verified workers. Fair pay. Trusted community.
          </p>

          <p className="customer-description">
            India's worker-owned cooperative marketplace for
            trusted household and community services. Built on
            collective equity, transparency, and lifelong craft
            dignity.
          </p>


          {/* =========================================
              BENEFITS
          ========================================= */}

          <div className="customer-benefits">

            {/* BENEFIT 1 */}

            <div className="customer-benefit">

              <div className="customer-benefit-dot"></div>

              <div className="customer-benefit-content">

                <h3>
                  100% Verified Skilled Trades
                </h3>

                <p>
                  Background-checked electricians, plumbers,
                  and carpenters co-owning the platform.
                </p>

              </div>

            </div>


            {/* BENEFIT 2 */}

            <div className="customer-benefit">

              <div className="customer-benefit-dot"></div>

              <div className="customer-benefit-content">

                <h3>
                  0% Middleman Exploitation
                </h3>

                <p>
                  Revenue goes directly to the member-workers
                  doing the job.
                </p>

              </div>

            </div>


            {/* BENEFIT 3 */}

            <div className="customer-benefit">

              <div className="customer-benefit-dot"></div>

              <div className="customer-benefit-content">

                <h3>
                  Transparent Upfront Pricing
                </h3>

                <p>
                  Itemized rate cards and cooperative
                  satisfaction guarantee with zero surge pricing.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =========================================
            LOGIN CARD
        ========================================= */}

        <section className="customer-login-card">

          {/* =========================================
              SECURE LOGIN
          ========================================= */}

          <div className="customer-secure-label">

            <span className="customer-lock-icon">
              🔒
            </span>

            SECURE LOGIN

          </div>


          <h2>
            Sign in
          </h2>

          <p className="customer-welcome">
            Welcome back to Co-op Serve
          </p>


          {/* =========================================
              LOGIN FORM
          ========================================= */}

          <form
            className="customer-login-form"
            onSubmit={handleSubmit}
          >

            {/* =========================================
                USERNAME / EMAIL
            ========================================= */}

            <div className="customer-field">

              <div className="customer-label-row">

                <label htmlFor="customer-username">
                  Username or Email
                  <span>*</span>
                </label>

              </div>

              <input
                id="customer-username"
                name="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="name@example.com or username"
                autoComplete="username"
                required
              />

            </div>


            {/* =========================================
                PASSWORD
            ========================================= */}

            <div className="customer-field">

              <label htmlFor="customer-password">

                Password
                <span>*</span>

              </label>

              <div className="customer-password-wrapper">

                <input
                  id="customer-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                {/* SHOW / HIDE PASSWORD */}

                <button
                  type="button"
                  className="customer-password-toggle"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >

                    <path
                      d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    />

                  </svg>

                </button>

              </div>

            </div>


            {/* =========================================
                REMEMBER / FORGOT PASSWORD
            ========================================= */}

            <div className="customer-login-options">

              <label className="customer-remember">

                <input
                  type="checkbox"
                  name="remember"
                />

                <span>
                  Remember this device
                </span>

              </label>


              <Link
                to="#"
                className="customer-forgot-password"
              >
                Forgot password?
              </Link>

            </div>


            {/* =========================================
                SIGN IN
            ========================================= */}

            <button
              type="submit"
              className="customer-signin-button"
            >
              Sign In
            </button>

          </form>


          {/* =========================================
              BOTTOM SECTION
          ========================================= */}

          <div className="customer-login-bottom">

            {/* =========================================
                DIVIDER
            ========================================= */}

            <div className="customer-divider">

              <span></span>

              <strong>
                OR
              </strong>

              <span></span>

            </div>


            {/* =========================================
                CUSTOMER REGISTRATION
            ========================================= */}

            <p className="customer-login-register">

              New customer?

              <Link to="/customer-registration">
                Create an account
              </Link>

            </p>


            {/* =========================================
                WORKER LOGIN
            ========================================= */}

            <div className="customer-worker-box">

              <span>
                Are you a registered service professional?
              </span>

              <Link to="/worker-login">

                Worker Login

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


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="customer-login-footer">

        <span>
          © 2026 Co-op Serve. • A Worker-Owned Cooperative Enterprise.
        </span>

      </footer>

    </div>
  );
}

export default CustomerLogin;