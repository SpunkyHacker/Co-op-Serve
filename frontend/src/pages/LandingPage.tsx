import { Link } from "react-router-dom";

import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing-page">

      {/* =========================================
          NAVBAR
      ========================================= */}

      <header className="landing-navbar">

        <div className="landing-navbar-inner">

          <Link
            to="/"
            className="landing-logo"
          >
            Co-op Serve
          </Link>


          <nav className="landing-nav-links">

            <a href="#how-it-works">
              How it works
            </a>

            <a href="#workers">
              For Workers
            </a>

            <a href="#about">
              About
            </a>

          </nav>

        </div>

      </header>


      {/* =========================================
          MAIN
      ========================================= */}

      <main>

        {/* =========================================
            HERO SECTION
        ========================================= */}

        <section className="landing-hero">

          <h1>
            Verified workers.
            <br />
            Fair pay.
            <br />
            Trusted community.
          </h1>


          <p className="landing-hero-subtitle">
            India's first worker-owned cooperative
            marketplace for trusted household and
            community services.
          </p>


          {/* =========================================
              CUSTOMER / WORKER CARDS
          ========================================= */}

          <div className="landing-user-cards">


            {/* CUSTOMER CARD */}

            <div className="landing-user-card">

              <div className="landing-icon-circle">

                <span className="material-symbols-outlined">
                  home_repair_service
                </span>

              </div>


              <span className="landing-card-label">
                CUSTOMER
              </span>


              <h2>
                I need a service
              </h2>


              <p>
                Book verified professionals for your home.
              </p>


              <Link
                to="/customer-login"
                className="landing-primary-button"
              >
                Login to find a Pro
              </Link>

            </div>


            {/* WORKER CARD */}

            <div className="landing-user-card">

              <div className="landing-icon-circle">

                <span className="material-symbols-outlined">
                  handyman
                </span>

              </div>


              <span className="landing-card-label">
                WORKER
              </span>


              <h2>
                I'm a skilled worker
              </h2>


              <p>
                Earn fair wages. Find suitable work.
              </p>


              <Link
                to="/worker-login"
                className="landing-secondary-button"
              >
                Login to View available Jobs
              </Link>

            </div>

          </div>

        </section>


        {/* =========================================
            HOW IT WORKS
        ========================================= */}

        <section
          className="landing-how-section"
          id="how-it-works"
        >

          <div className="landing-section-container">

            <h2>
              How it works - As a Customer
            </h2>


            <div className="landing-steps">


              {/* STEP 1 */}

              <div className="landing-step">

                <div className="landing-step-icon">

                  <span className="material-symbols-outlined">
                    search
                  </span>

                </div>


                <h3>
                  Book
                </h3>


                <p>
                  Search for verified services and schedule
                  a convenient time.
                </p>

              </div>


              <div className="landing-step-line"></div>


              {/* STEP 2 */}

              <div className="landing-step">

                <div className="landing-step-icon">

                  <span className="material-symbols-outlined">
                    handshake
                  </span>

                </div>


                <h3>
                  Get Matched
                </h3>


                <p>
                  Connect directly with a verified
                  cooperative member near you.
                </p>

              </div>


              <div className="landing-step-line"></div>


              {/* STEP 3 */}

              <div className="landing-step">

                <div className="landing-step-icon">

                  <span className="material-symbols-outlined">
                    task_alt
                  </span>

                </div>


                <h3>
                  Get it Done
                </h3>


                <p>
                  Experience quality service while
                  ensuring fair wages.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =========================================
            TRUST SECTION
        ========================================= */}

        <section
          className="landing-trust-section"
          id="about"
        >

          <p className="landing-trust-title">
            BACKED BY LABOUR COOPERATIVE FEDERATIONS
          </p>


          <div className="landing-trust-items">

            <span>
              Federation One
            </span>

            <span>
              Co-op Trust
            </span>

            <span>
              Worker's Union
            </span>

            <span>
              Skill Guild
            </span>

          </div>

        </section>


        {/* =========================================
            POPULAR SERVICES
        ========================================= */}

        <section className="landing-services-section">

          <div className="landing-section-container">

            <h2>
              Popular Services
            </h2>


            <div className="landing-services-grid">


              {/* ELECTRICIAN */}

              <div className="landing-service-card">

                <span className="material-symbols-outlined">
                  electrical_services
                </span>

                <span>
                  Electricians
                </span>

              </div>


              {/* PLUMBER */}

              <div className="landing-service-card">

                <span className="material-symbols-outlined">
                  plumbing
                </span>

                <span>
                  Plumbers
                </span>

              </div>


              {/* CARPENTER */}

              <div className="landing-service-card">

                <span className="material-symbols-outlined">
                  carpenter
                </span>

                <span>
                  Carpenters
                </span>

              </div>


              {/* PAINTER */}

              <div className="landing-service-card">

                <span className="material-symbols-outlined">
                  format_paint
                </span>

                <span>
                  Painters
                </span>

              </div>


              {/* CLEANER */}

              <div className="landing-service-card">

                <span className="material-symbols-outlined">
                  cleaning_services
                </span>

                <span>
                  Cleaners
                </span>

              </div>

            </div>

          </div>

        </section>

      </main>


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="landing-footer">

        <div className="landing-footer-logo">
          Co-op Serve
        </div>


        <p className="landing-copyright">
          © 2024 Co-op Serve.
          Powered by Labour Cooperative Federations.
        </p>

      </footer>

    </div>
  );
}

export default LandingPage;