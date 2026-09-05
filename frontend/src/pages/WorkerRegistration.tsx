// WorkerRegistration.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./WorkerRegistration.css";


function WorkerRegistration() {
  const navigate = useNavigate();

  // =========================================
  // STEP STATE
  // =========================================
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================
  // FORM STATES
  // =========================================
  // Step 1: Basic
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Details
  const [sex, setSex] = useState("");
  const [workCategory, setWorkCategory] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");

  // Step 3: KYC
  const [eshramNumber, setEshramNumber] = useState("");

  // Step 4: Payment
  const [upiId, setUpiId] = useState("");

  // =========================================
  // UI / ERROR STATES
  // =========================================
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Timer countdown logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // =========================================
  // VALIDATION
  // =========================================
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isValidPhone = (value: string) => /^[6-9]\d{9}$/.test(value);
  const isValidPassword = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const canProceedStep1 =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    isValidPhone(phone) &&
    isValidEmail(email) &&
    isValidPassword &&
    passwordsMatch;

  const canProceedStep2 =
    sex !== "" &&
    workCategory !== "" &&
    state.trim() !== "" &&
    district.trim() !== "" &&
    address.trim() !== "";

  const canProceedStep3 = eshramNumber.trim().length > 5; // Basic length check for eShram
  const canProceedStep4 = upiId.includes("@");

  // =========================================
  // NAVIGATION HANDLERS
  // =========================================
  const handleNext = () => {
    setFormError("");
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setFormError("");
    setCurrentStep((prev) => prev - 1);
  };

  // =========================================
  // SUBMISSION
  // =========================================
  // =========================================
  // CREATE ACCOUNT (WORKER)
  // =========================================
  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

      // Prevent execution if already submitting
    if (!canProceedStep4 || isSubmitting) return;

    // Lock the form
    setIsSubmitting(true);
    if (!canProceedStep4) return;

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: "http://localhost:5173/worker-login",
        data: {
          // 'users' table fields
          name: `${firstName} ${lastName}`.trim(),
          phone: phone,
          role: "worker",
          home_address: { 
            state: state, 
            district: district, 
            locality: address 
          }, 
          
          // 'workers' table fields
          gender: sex.toLowerCase(),
          skill_category: workCategory,
          eshram_id: eshramNumber,
          upi_id: upiId,
        },
      },
    });
    // Unlock the form when the request finishes
    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
    } else {
      setShowPopup(true);
      setResendTimer(60);
    }
  };

  const handleResendEmail = async () => {
    if (resendTimer > 0) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: "http://localhost:5173/worker-login",
      },
    });

    if (error) {
      setFormError(error.message);
    } else {
      setResendTimer(60);
    }
  };

  // =========================================
  // RENDER HELPERS
  // =========================================
  const stepTitles = ["Basic Information", "Work Details", "KYC Verification", "Payment Details"];

  return (
    <div className="worker-registration-page">
      {/* HEADER */}
      <header className="worker-registration-header">
        <div className="worker-header-left">
          <Link to="/" className="worker-registration-logo">
            <span className="worker-logo-box">CS</span>
            <span>Co-op Serve</span>
          </Link>
          <span className="worker-owned-badge">
            <span className="worker-badge-check">✓</span>
            Worker-Owned
          </span>
        </div>
      </header>

      {/* MAIN */}
      <main className="worker-registration-main">
        <div className="worker-registration-label">CO-OP SERVE PLATFORM</div>
        <h1 className="worker-registration-title">WORKER REGISTRATION</h1>

        <section className="worker-registration-card">
          <div className="worker-registration-intro">
            <h2>Create Worker Account</h2>
            <div className="worker-progress-indicator">
              <span className="worker-progress-text">
                Step {currentStep} of 4: <strong>{stepTitles[currentStep - 1]}</strong>
              </span>
              <div className="worker-progress-bar-container">
                <div
                  className="worker-progress-bar-fill"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <form className="worker-registration-form" onSubmit={handleCreateAccount}>
            
            {/* =====================================
                STEP 1: BASIC INFORMATION
            ===================================== */}
            {currentStep === 1 && (
              <div className="worker-step-content">
                <div className="worker-name-row">
                  <div className="worker-form-field">
                    <label htmlFor="first-name">
                      First Name <span>*</span>
                    </label>
                    <input
                      id="first-name"
                      type="text"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="worker-form-field">
                    <label htmlFor="last-name">
                      Last Name <span>*</span>
                    </label>
                    <input
                      id="last-name"
                      type="text"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="worker-form-field">
                  <label htmlFor="phone">
                    Phone Number <span>*</span>
                  </label>
                  <div className="worker-phone-wrapper">
                    <span className="worker-country-code">+91</span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                  {phone.length > 0 && !isValidPhone(phone) && (
                    <small className="worker-field-error">Enter a valid 10-digit Indian mobile number.</small>
                  )}
                </div>

                <div className="worker-form-field">
                  <label htmlFor="email">
                    Email Address <span>*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="worker-form-field">
                  <label htmlFor="password">
                    Login Password <span>*</span>
                  </label>
                  <div className="worker-password-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="worker-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "◉" : "◌"}
                    </button>
                  </div>
                  <small className="worker-password-help">Use at least 8 characters.</small>
                </div>

                <div className="worker-form-field">
                  <label htmlFor="confirm-password">
                    Confirm Password <span>*</span>
                  </label>
                  <div className="worker-password-wrapper">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="worker-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "◉" : "◌"}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <small className="worker-field-error">Passwords do not match.</small>
                  )}
                </div>

                <div className="worker-form-actions">
                  <button
                    type="button"
                    className="worker-btn-primary full-width"
                    disabled={!canProceedStep1}
                    onClick={handleNext}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* =====================================
                STEP 2: DETAILS
            ===================================== */}
            {currentStep === 2 && (
              <div className="worker-step-content">
                <div className="worker-form-field">
                  <label>Sex <span>*</span></label>
                  <div className="worker-radio-group">
                    <label className="worker-radio-label">
                      <input type="radio" name="sex" value="Male" checked={sex === "Male"} onChange={(e) => setSex(e.target.value)} />
                      Male
                    </label>
                    <label className="worker-radio-label">
                      <input type="radio" name="sex" value="Female" checked={sex === "Female"} onChange={(e) => setSex(e.target.value)} />
                      Female
                    </label>
                    <label className="worker-radio-label">
                      <input type="radio" name="sex" value="Other" checked={sex === "Other"} onChange={(e) => setSex(e.target.value)} />
                      Other
                    </label>
                  </div>
                </div>

                <div className="worker-form-field">
                  <label htmlFor="work-category">
                    Work Category <span>*</span>
                  </label>
                  <select
                    id="work-category"
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value)}
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Painting">Painting</option>
                    <option value="Masonry">Masonry</option>
                    <option value="Appliance Repair">Appliance Repair</option>
                  </select>
                </div>

                <div className="worker-name-row">
                  <div className="worker-form-field">
                    <label htmlFor="state">
                      State <span>*</span>
                    </label>
                    <input
                      id="state"
                      type="text"
                      placeholder="e.g. Tamil Nadu"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                  </div>
                  <div className="worker-form-field">
                    <label htmlFor="district">
                      District <span>*</span>
                    </label>
                    <input
                      id="district"
                      type="text"
                      placeholder="e.g. Vellore"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="worker-form-field">
                  <label htmlFor="address">
                    Full Address <span>*</span>
                  </label>
                  <input
                    id="address"
                    type="text"
                    placeholder="Enter your complete residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="worker-form-actions">
                  <button type="button" className="worker-btn-secondary" onClick={handleBack}>Back</button>
                  <button type="button" className="worker-btn-primary" disabled={!canProceedStep2} onClick={handleNext}>Next Step</button>
                </div>
              </div>
            )}

            {/* =====================================
                STEP 3: KYC
            ===================================== */}
            {currentStep === 3 && (
              <div className="worker-step-content">
                <div className="worker-form-field">
                  <label htmlFor="eshram-number">
                    eShram Number <span>*</span>
                  </label>
                  <input
                    id="eshram-number"
                    type="text"
                    placeholder="Enter your 12-digit eShram/UAN number"
                    value={eshramNumber}
                    onChange={(e) => setEshramNumber(e.target.value)}
                    required
                  />
                  <small className="worker-password-help">
                    This is required to verify your identity and ensure trust on the Co-op Serve platform.
                  </small>
                </div>

                <div className="worker-form-actions">
                  <button type="button" className="worker-btn-secondary" onClick={handleBack}>Back</button>
                  <button type="button" className="worker-btn-primary" disabled={!canProceedStep3} onClick={handleNext}>Next Step</button>
                </div>
              </div>
            )}

            {/* =====================================
                STEP 4: PAYMENT & SUBMIT
            ===================================== */}
            {currentStep === 4 && (
              <div className="worker-step-content">
                <div className="worker-form-field">
                  <label htmlFor="upi-id">
                    UPI ID <span>*</span>
                  </label>
                  <input
                    id="upi-id"
                    type="text"
                    placeholder="e.g. mobile@ybl or name@okicici"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                  />
                  <small className="worker-password-help">
                    Your earnings will be directly transferred to this UPI ID with zero platform cuts.
                  </small>
                </div>

                {formError && (
                  <small className="worker-field-error" style={{ display: 'block', marginBottom: '15px' }}>
                    {formError}
                  </small>
                )}

                <div className="worker-form-actions">
                  <button type="button" className="worker-btn-secondary" onClick={handleBack}>Back</button>
                  <button type="submit" className="worker-btn-primary" disabled={!canProceedStep4} >
                    {isSubmitting ? "Creating Account..." : "Create Account"}
                  </button>
                </div>
              </div>
            )}

          </form>

          {/* LOGIN LINK */}
          <div className="worker-existing-account">
            <span>Already have an account?</span>
            <Link to="/worker-login">Worker Login</Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="worker-registration-footer">
        © 2026 Co-op Serve • A Worker-Owned Cooperative Enterprise.
      </footer>

      {/* POPUP MODAL */}
      {showPopup && (
        <div className="worker-popup-overlay">
          <div className="worker-popup-box">
            <h2>Check your mail!</h2>
            <p>
              We've sent a verification link to <strong>{email}</strong>. 
              Please click the link to verify your worker account.
            </p>

            {formError && (
              <small className="worker-field-error" style={{ display: 'block', marginBottom: '1rem' }}>
                {formError}
              </small>
            )}

            <div className="worker-popup-actions">
              <button 
                className="worker-resend-button" 
                onClick={handleResendEmail}
                disabled={resendTimer > 0}
              >
                {resendTimer > 0 ? `Resend Email in ${resendTimer}s` : "Resend Email"}
              </button>
              
              <button 
                className="worker-change-email-button"
                onClick={() => {
                  setShowPopup(false);
                  setFormError("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerRegistration;