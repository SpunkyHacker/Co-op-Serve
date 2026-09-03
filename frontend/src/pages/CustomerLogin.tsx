import { useState } from "react";
import "./CustomerLogin.css";
import { Link } from "react-router-dom";

function CustomerLogin() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Supabase login will be added here later
    console.log("Customer login submitted");
  };

  return (
    <div className="customer-login-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="customer-login-header">

        <div className="customer-login-header-left">

          {/* Logo */}
          <a href="/" className="customer-login-logo">
            <div className="customer-login-logo-icon">
              CS
            </div>

            <span>Co-op Serve</span>
          </a>

          {/* Worker-Owned Badge */}
          <div className="customer-login-badge">
            <span className="customer-login-badge-icon">
              ✓
            </span>

            Worker-Owned
          </div>

        </div>


        

      </header>


      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="customer-login-main">

        <div className="customer-login-container">


          {/* =====================================
              LEFT BRANDING SECTION
          ===================================== */}

          <section className="customer-login-branding">

            <h1>
              CUSTOMER LOGIN
            </h1>

            <h2>
              Co-op Serve
            </h2>

            <p className="customer-login-tagline">
              Verified workers. Fair pay. Trusted community.
            </p>


            {/* Features */}

            <div className="customer-login-features">

              {/* Feature 1 */}
              <div className="customer-login-feature">

                <div className="customer-login-feature-dot"></div>

                <div>
                  <h3>
                    100% Verified Skilled Trades
                  </h3>

                  <p>
                    Background-checked electricians, plumbers,
                    and carpenters co-owning the platform.
                  </p>
                </div>

              </div>


              {/* Feature 2 */}
              <div className="customer-login-feature">

                <div className="customer-login-feature-dot"></div>

                <div>
                  <h3>
                    0% Middleman Exploitation
                  </h3>

                  <p>
                    Revenue goes directly to the member-workers
                    doing the job.
                  </p>
                </div>

              </div>


              {/* Feature 3 */}
              <div className="customer-login-feature">

                <div className="customer-login-feature-dot"></div>

                <div>
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



          {/* =====================================
              LOGIN CARD
          ===================================== */}

          <section className="customer-login-card">


            {/* Card Header */}

            <div className="customer-login-card-header">

              <div className="customer-login-secure">

                <span className="customer-login-lock">
                  🔒
                </span>

                Secure Login

              </div>

              <h2>
                Sign in
              </h2>

              <p>
                Welcome back to Co-op Serve
              </p>

            </div>



            {/* =================================
                LOGIN FORM
            ================================= */}

            <form
              className="customer-login-form"
              onSubmit={handleSubmit}
            >


              {/* Username / Email */}

              <div className="customer-login-field">

                <div className="customer-login-label-row">

                  <label htmlFor="username">
                    Username or Email
                    <span>*</span>
                  </label>

                  

                </div>

                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="name@example.com or username"
                  autoComplete="username"
                  required
                />

              </div>



              {/* Password */}

              <div className="customer-login-field">

                <div className="customer-login-label-row">

                  <label htmlFor="password">
                    Password
                    <span>*</span>
                  </label>

                </div>


                <div className="customer-login-password-wrapper">

                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />


                  <button
                    type="button"
                    className="customer-login-show-password"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>

                </div>

              </div>



              {/* Remember + Forgot Password */}

              <div className="customer-login-options">

                <label className="customer-login-remember">

                  <input
                    type="checkbox"
                    name="remember"
                  />

                  <span>
                    Remember this device
                  </span>

                </label>


                <a
                  href="#"
                  className="customer-login-forgot"
                >
                  Forgot password?
                </a>

              </div>



              {/* Sign In */}

              <button
                type="submit"
                className="customer-login-button"
              >
                Sign In
              </button>

            </form>



            {/* =================================
                BOTTOM SECTION
            ================================= */}

            <div className="customer-login-bottom">


              {/* OR Divider */}

              <div className="customer-login-divider">

                <span></span>

                <p>
                  OR
                </p>

                <span></span>

              </div>



              {/* =========================================
    REGISTRATION
========================================= */}

<p className="customer-login-register">

  <span>
    New customer?
  </span>

  <Link to="/customer-registration">
    Create an account
  </Link>

</p>



              {/* Worker Login */}

              <div className="customer-login-worker-box">

                <span>
                  Are you a registered service professional?
                </span>

                <a
                  href="/worker-login"
                  className="customer-login-worker-link"
                >
                  Worker Login

                  <span>
                    →
                  </span>

                </a>

              </div>

            </div>

          </section>

        </div>

      </main>



      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="customer-login-footer">

        <div>
          © 2026 Co-op Serve. • A Worker-Owned Cooperative Enterprise.
        </div>


        

      </footer>

    </div>
  );
}

export default CustomerLogin;