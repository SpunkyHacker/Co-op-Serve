import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CustomerRegistration.css";

function CustomerRegistration() {
  const navigate = useNavigate();

  // =========================================
  // FORM STATES
  // =========================================

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // =========================================
  // OTP STATES
  // =========================================

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");

  // Demo OTP
  // Replace this with backend OTP verification later.
  const DEMO_OTP = "123456";

  // =========================================
  // PASSWORD VISIBILITY
  // =========================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // =========================================
  // EMAIL VALIDATION
  // =========================================

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // =========================================
  // PHONE VALIDATION
  // =========================================

  const isValidPhone = (value: string) => {
    return /^[6-9]\d{9}$/.test(value);
  };

  // =========================================
  // PASSWORD VALIDATION
  // =========================================

  const isValidPassword = password.length >= 8;

  // =========================================
  // SEND OTP
  // =========================================

  const handleSendOTP = () => {
    setEmailError("");
    setOtpError("");

    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    // Reset verification if email is changed
    setEmailVerified(false);
    setOtp("");
    setOtpSent(true);

    // Demo behaviour
    console.log("OTP sent to:", email);
    console.log("Demo OTP:", DEMO_OTP);
  };

  // =========================================
  // VERIFY OTP
  // =========================================

  const handleVerifyOTP = () => {
    setOtpError("");

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (otp !== DEMO_OTP) {
      setOtpError("Incorrect OTP. Please try again.");
      return;
    }

    setEmailVerified(true);
    setOtpError("");
  };

  // =========================================
  // RESEND OTP
  // =========================================

  const handleResendOTP = () => {
    setOtp("");
    setOtpError("");

    console.log("OTP resent to:", email);
    console.log("Demo OTP:", DEMO_OTP);
  };

  // =========================================
  // CREATE ACCOUNT VALIDATION
  // =========================================

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canCreateAccount =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    isValidPhone(phone) &&
    isValidEmail(email) &&
    emailVerified &&
    isValidPassword &&
    passwordsMatch;

  // =========================================
  // CREATE ACCOUNT
  // =========================================

  const handleCreateAccount = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!emailVerified) {
      setEmailError(
        "Please verify your email before creating your account."
      );
      return;
    }

    if (!canCreateAccount) {
      return;
    }

    // Registration backend will be connected here later.
    console.log("Customer account created:", {
      firstName,
      lastName,
      phone,
      email,
      password,
    });

    // For now, redirect to customer login
    navigate("/customer-login");
  };

  return (
    <div className="customer-registration-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="customer-registration-header">

        <div className="customer-header-left">

          <Link
            to="/"
            className="customer-registration-logo"
          >
            <span className="customer-logo-box">
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

      <main className="customer-registration-main">

        {/* PAGE LABEL */}

        <div className="customer-registration-label">
          CO-OP SERVE PLATFORM
        </div>


        {/* PAGE TITLE */}

        <h1 className="customer-registration-title">
          CUSTOMER REGISTRATION
        </h1>


        {/* =========================================
            REGISTRATION CARD
        ========================================= */}

        <section className="customer-registration-card">

          {/* CARD INTRO */}

          <div className="customer-registration-intro">

            <h2>
              Create Customer Account

            </h2>

           

            <br />

    
          </div>

          {/* =========================================
              FORM
          ========================================= */}

          <form
            className="customer-registration-form"
            onSubmit={handleCreateAccount}
          >

            {/* =====================================
                FIRST NAME + LAST NAME
            ===================================== */}

            <div className="customer-name-row">

              <div className="customer-form-field">

                <label htmlFor="customer-first-name">
                  First Name <span>*</span>
                </label>

                <input
                  id="customer-first-name"
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  required
                />

              </div>


              <div className="customer-form-field">

                <label htmlFor="customer-last-name">
                  Last Name <span>*</span>
                </label>

                <input
                  id="customer-last-name"
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  required
                />

              </div>

            </div>


            {/* =====================================
                PHONE NUMBER
            ===================================== */}

            <div className="customer-form-field">

              <label htmlFor="customer-phone">
                Phone Number <span>*</span>
              </label>

              <div className="customer-phone-wrapper">

                <span className="customer-country-code">
                  +91
                </span>

                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(/\D/g, "");

                    setPhone(value);
                  }}
                  required
                />

              </div>

              {phone.length > 0 && !isValidPhone(phone) && (
                <small className="customer-field-error">
                  Enter a valid 10-digit Indian mobile number.
                </small>
              )}

            </div>


            {/* =====================================
                EMAIL + VERIFY BUTTON
            ===================================== */}

            <div className="customer-form-field">

              <label htmlFor="customer-email">
                Email Address <span>*</span>
              </label>

              <div className="customer-email-row">

                <input
                  id="customer-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  disabled={emailVerified}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                    setEmailVerified(false);
                    setOtpSent(false);
                  }}
                  required
                />

                <button
                  type="button"
                  className={
                    emailVerified
                      ? "customer-verify-button verified"
                      : "customer-verify-button"
                  }
                  onClick={
                    emailVerified
                      ? undefined
                      : handleSendOTP
                  }
                  disabled={emailVerified}
                >
                  {emailVerified
                    ? "Verified ✓"
                    : "Verify OTP"}
                </button>

              </div>


              {/* EMAIL ERROR */}

              {emailError && (
                <small className="customer-field-error">
                  {emailError}
                </small>
              )}


              {/* =================================
                  OTP AREA
              ================================= */}

              {otpSent && !emailVerified && (
                <div className="customer-otp-box">

                  <div className="customer-otp-title">
                    Verify your email
                  </div>

                  <p>
                    We've sent a 6-digit verification code
                    to your email address.
                  </p>

                  <label htmlFor="customer-otp">
                    Enter OTP
                  </label>

                  <div className="customer-otp-row">

                    <input
                      id="customer-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="------"
                      value={otp}
                      onChange={(event) => {
                        const value =
                          event.target.value.replace(/\D/g, "");

                        setOtp(value);
                        setOtpError("");
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      className="customer-otp-verify-button"
                    >
                      Verify OTP
                    </button>

                  </div>


                  {otpError && (
                    <small className="customer-field-error">
                      {otpError}
                    </small>
                  )}


                  <button
                    type="button"
                    className="customer-resend-button"
                    onClick={handleResendOTP}
                  >
                    Resend OTP
                  </button>

                </div>
              )}


              {/* VERIFIED MESSAGE */}

              {emailVerified && (
                <div className="customer-email-verified">
                  Email Verified ✓
                </div>
              )}

            </div>


            {/* =====================================
                PASSWORD
            ===================================== */}

            <div className="customer-form-field">

              <label htmlFor="customer-password">
                Login Password <span>*</span>
              </label>

              <div className="customer-password-wrapper">

                <input
                  id="customer-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="customer-password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label="Show or hide password"
                >
                  {showPassword ? "◉" : "◌"}
                </button>

              </div>

              <small className="customer-password-help">
                Use at least 8 characters.
              </small>

            </div>


            {/* =====================================
                CONFIRM PASSWORD
            ===================================== */}

            <div className="customer-form-field">

              <label htmlFor="customer-confirm-password">
                Confirm Password <span>*</span>
              </label>

              <div className="customer-password-wrapper">

                <input
                  id="customer-confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="customer-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label="Show or hide password"
                >
                  {showConfirmPassword ? "◉" : "◌"}
                </button>

              </div>


              {confirmPassword.length > 0 &&
                !passwordsMatch && (
                  <small className="customer-field-error">
                    Passwords do not match.
                  </small>
                )}

            </div>


            {/* =====================================
                CREATE ACCOUNT
            ===================================== */}

            <button
              type="submit"
              className="customer-create-account-button"
              disabled={!canCreateAccount}
            >
              Create Account
            </button>

          </form>


          {/* =========================================
              LOGIN LINK
          ========================================= */}

          <div className="customer-existing-account">

            <span>
              Already have an account?
            </span>

            <Link to="/customer-login">
              Customer Login
            </Link>

          </div>

        </section>

      </main>


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="customer-registration-footer">
        © 2026 Co-op Serve • A Worker-Owned Cooperative Enterprise.
      </footer>

    </div>
  );
}

export default CustomerRegistration;