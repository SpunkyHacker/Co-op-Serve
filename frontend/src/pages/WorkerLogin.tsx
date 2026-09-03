import { Link } from "react-router-dom";
import "./WorkerLogin.css";

function WorkerLogin() {
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

          <h1>
            WORKER LOGIN
          </h1>

          <h2>
            Co-op Serve
          </h2>

          <p className="worker-tagline">
            Verified workers. Fair pay. Trusted community.
          </p>


          {/* THREE WORKER BENEFITS */}

          <div className="worker-benefits">

            {/* 100% DIRECT */}

            <div className="worker-benefit">

              <div className="worker-benefit-dot"></div>

              <div className="worker-benefit-content">

                <h3>
                  100% Direct
                </h3>

                <p>
                  Zero cuts. Revenue goes directly to member-workers.
                </p>

              </div>

            </div>


            {/* FAIR WORK */}

            <div className="worker-benefit">

              <div className="worker-benefit-dot"></div>

              <div className="worker-benefit-content">

                <h3>
                  Fair Work
                </h3>

                <p>
                  Find suitable local jobs with transparent pricing.
                </p>

              </div>

            </div>


            {/* WORKER OWNED */}

            <div className="worker-benefit">

              <div className="worker-benefit-dot"></div>

              <div className="worker-benefit-content">

                <h3>
                  Worker Owned
                </h3>

                <p>
                  Be part of a cooperative built around worker dignity.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================================
            LOGIN CARD
        ================================= */}

        <section className="worker-login-card">

          <div className="worker-secure-label">

            <span className="worker-lock-icon">
              🔒
            </span>

            SECURE LOGIN

          </div>


          <h2>
            Sign in
          </h2>

          <p className="worker-welcome">
            Welcome back to Co-op Serve
          </p>


          {/* ================================
              LOGIN FORM
          ================================= */}

          <form
            className="worker-login-form"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >

            {/* USERNAME */}

            <div className="worker-field">

              <div className="worker-label-row">

                <label htmlFor="worker-username">
                  Username or Email <span>*</span>
                </label>


              </div>

              <input
                id="worker-username"
                name="username"
                type="text"
                placeholder="name@example.com or username"
                autoComplete="username"
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
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="worker-password-toggle"
                  aria-label="Show password"
                  onClick={() => {
                    const input = document.getElementById(
                      "worker-password"
                    ) as HTMLInputElement | null;

                    if (input) {
                      input.type =
                        input.type === "password"
                          ? "text"
                          : "password";
                    }
                  }}
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


            {/* REMEMBER / FORGOT */}

            <div className="worker-login-options">

              <label className="worker-remember">

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
                className="worker-forgot-password"
              >
                Forgot password?
              </Link>

            </div>


            {/* SIGN IN */}

            <button
              type="submit"
              className="worker-signin-button"
            >
              Sign In
            </button>

          </form>


          {/* ================================
              BOTTOM
          ================================= */}

          <div className="worker-login-bottom">

            <div className="worker-divider">

              <span></span>

              <strong>
                OR
              </strong>

              <span></span>

            </div>


            <p className="worker-register">

              New worker?{" "}

              <Link to="#">
                Create an account
              </Link>

            </p>


            {/* CUSTOMER LOGIN */}

            <div className="worker-customer-box">

              <span>
                Are you looking for a service?
              </span>

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

        <span>
          © 2026 Co-op Serve. • A Worker-Owned Cooperative Enterprise.
        </span>

    

      </footer>

    </div>
  );
}

export default WorkerLogin;