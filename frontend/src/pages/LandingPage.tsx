import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./LandingPage.css";

function LandingPage() {
  const { t,i18n } = useTranslation();

  return (
    <div className="landing-page">

      {/* =========================================
          NAVBAR
      ========================================= */}
      <header className="landing-navbar">
        <div className="landing-navbar-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Link to="/" className="landing-logo">
            Co-op Serve
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <nav className="landing-nav-links">
              <a href="#how-it-works">{t('landing.nav.howItWorks')}</a>
              <a href="#workers">{t('landing.nav.forWorkers')}</a>
              <a href="#about">{t('landing.nav.about')}</a>
            </nav>

            {/* LANGUAGE TOGGLE */}
            <select 
              value={i18n.language} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              style={{ 
                padding: '6px 10px', 
                borderRadius: '6px', 
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिंदी</option>
            </select>
          </div>
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
            {t('landing.hero.titleLine1')}
            <br />
            {t('landing.hero.titleLine2')}
            <br />
            {t('landing.hero.titleLine3')}
          </h1>

          <p className="landing-hero-subtitle">
            {t('landing.hero.subtitle')}
          </p>

          <div className="landing-user-cards">
            {/* CUSTOMER CARD */}
            <div className="landing-user-card">
              <div className="landing-icon-circle">
                <span className="material-symbols-outlined">home_repair_service</span>
              </div>
              <span className="landing-card-label">{t('landing.hero.customer')}</span>
              <h2>{t('landing.hero.customerTitle')}</h2>
              <p>{t('landing.hero.customerDesc')}</p>
              <Link to="/customer-login" className="landing-primary-button">
                {t('landing.hero.customerBtn')}
              </Link>
            </div>

            {/* WORKER CARD */}
            <div className="landing-user-card">
              <div className="landing-icon-circle">
                <span className="material-symbols-outlined">handyman</span>
              </div>
              <span className="landing-card-label">{t('landing.hero.worker')}</span>
              <h2>{t('landing.hero.workerTitle')}</h2>
              <p>{t('landing.hero.workerDesc')}</p>
              <Link to="/worker-login" className="landing-secondary-button">
                {t('landing.hero.workerBtn')}
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================
            HOW IT WORKS
        ========================================= */}
        <section className="landing-how-section" id="how-it-works">
          <div className="landing-section-container">
            <h2>{t('landing.how.title')}</h2>

            <div className="landing-steps">
              {/* STEP 1 */}
              <div className="landing-step">
                <div className="landing-step-icon">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <h3>{t('landing.how.step1')}</h3>
                <p>{t('landing.how.step1Desc')}</p>
              </div>

              <div className="landing-step-line"></div>

              {/* STEP 2 */}
              <div className="landing-step">
                <div className="landing-step-icon">
                  <span className="material-symbols-outlined">handshake</span>
                </div>
                <h3>{t('landing.how.step2')}</h3>
                <p>{t('landing.how.step2Desc')}</p>
              </div>

              <div className="landing-step-line"></div>

              {/* STEP 3 */}
              <div className="landing-step">
                <div className="landing-step-icon">
                  <span className="material-symbols-outlined">task_alt</span>
                </div>
                <h3>{t('landing.how.step3')}</h3>
                <p>{t('landing.how.step3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            TRUST SECTION
        ========================================= */}
        <section className="landing-trust-section" id="about">
          <p className="landing-trust-title">{t('landing.trust.title')}</p>
          <div className="landing-trust-items">
            <span>{t('landing.trust.item1')}</span>
            <span>{t('landing.trust.item2')}</span>
            <span>{t('landing.trust.item3')}</span>
            <span>{t('landing.trust.item4')}</span>
          </div>
        </section>

        {/* =========================================
            POPULAR SERVICES
        ========================================= */}
        <section className="landing-services-section">
          <div className="landing-section-container">
            <h2>{t('landing.services.title')}</h2>

            <div className="landing-services-grid">
              <div className="landing-service-card">
                <span className="material-symbols-outlined">electrical_services</span>
                <span>{t('landing.services.electricians')}</span>
              </div>
              <div className="landing-service-card">
                <span className="material-symbols-outlined">plumbing</span>
                <span>{t('landing.services.plumbers')}</span>
              </div>
              <div className="landing-service-card">
                <span className="material-symbols-outlined">carpenter</span>
                <span>{t('landing.services.carpenters')}</span>
              </div>
              <div className="landing-service-card">
                <span className="material-symbols-outlined">format_paint</span>
                <span>{t('landing.services.painters')}</span>
              </div>
              <div className="landing-service-card">
                <span className="material-symbols-outlined">cleaning_services</span>
                <span>{t('landing.services.cleaners')}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================
          FOOTER
      ========================================= */}
      <footer className="landing-footer">
        <div className="landing-footer-logo">Co-op Serve</div>
        <p className="landing-copyright">{t('landing.footer.copyright')}</p>
      </footer>
    </div>
  );
}

export default LandingPage;