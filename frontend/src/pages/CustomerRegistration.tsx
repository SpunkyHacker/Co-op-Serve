import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useEffect } from "react";
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

 //const [otpSent, setOtpSent] = useState(false);
  //const [otp, setOtp] = useState("");
  //const [emailVerified, setEmailVerified] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");
  //const [otpError, setOtpError] = useState("");

  // Demo OTP
  // Replace this with backend OTP verification later.
  //DEMO_OTP = "123456";
  // =========================================
// POPUP & TIMER STATES
// =========================================
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

//   // =========================================
//   // SEND OTP
//   // =========================================
// const handleSendOTP = async () => {
//   setEmailError("");
//   setOtpError("");

//   if (!email.trim()) {
//     setEmailError("Please enter your email address.");
//     return;
//   }

//   if (!isValidEmail(email)) {
//     setEmailError("Please enter a valid email address.");
//     return;
//   }

//   const { error } = await supabase.auth.signInWithOtp({
//     email: email,
//     options: {
//       // Prevents sending a magic link, forces a 6-digit OTP
//       shouldCreateUser: true, 
//     },
//   });

//   if (error) {
//     setEmailError(error.message);
//   } else {
//     setEmailVerified(false);
//     setOtp("");
//     setOtpSent(true);
//   }
// };

//   // =========================================
//   // VERIFY OTP
//   // =========================================
// const handleVerifyOTP = async () => {
//   setOtpError("");

//   if (!/^\d{6}$/.test(otp)) {
//     setOtpError("Please enter a valid 6-digit OTP.");
//     return;
//   }

//   const { data, error } = await supabase.auth.verifyOtp({
//     email: email,
//     token: otp,
//     type: "email",
//   });

//   if (error) {
//     setOtpError(error.message);
//   } else if (data.session) {
//     setEmailVerified(true);
//     setOtpError("");
//   }
// };
//   // =========================================
//   // RESEND OTP
//   // =========================================

//   const handleResendOTP = () => {
//   setOtp("");
//   setOtpError("");
//   handleSendOTP();
// };
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
    isValidPassword &&
    passwordsMatch;

  // =========================================
  // CREATE ACCOUNT
  // =========================================
const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setEmailError("");

  if (!canCreateAccount) return;

  const { error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      emailRedirectTo: "http://localhost:5173/customer-login", 
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: "customer",
      },
    },
  });

  if (error) {
    setEmailError(error.message);
  } else {
    setShowPopup(true);
    setResendTimer(60); // Start 60-second cooldown
  }
};

const handleResendEmail = async () => {
  if (resendTimer > 0) return;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
    options: {
      emailRedirectTo: "http://localhost:5173/customer-login",
    },
  });

  if (error) {
    setEmailError(error.message);
  } else {
    setResendTimer(60); // Restart cooldown
  }
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

              <input
                id="customer-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError("");
                }}
                required
              />

              {/* EMAIL ERROR */}
              {emailError && (
                <small className="customer-field-error">
                  {emailError}
                </small>
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
        {/* =========================================
          VERIFICATION POPUP MODAL
      ========================================= */}
      {showPopup && (
        <div className="customer-popup-overlay">
          <div className="customer-popup-box">
            <h2>Check your mail!</h2>
            <p>
              We've sent a verification link to <strong>{email}</strong>. 
              Please click the link to verify your account.
            </p>

            {emailError && (
              <small className="customer-field-error" style={{ display: 'block', marginBottom: '1rem' }}>
                {emailError}
              </small>
            )}

            <div className="customer-popup-actions">
              <button 
                className="customer-resend-button" 
                onClick={handleResendEmail}
                disabled={resendTimer > 0}
              >
                {resendTimer > 0 ? `Resend Email in ${resendTimer}s` : "Resend Email"}
              </button>
              
              <button 
                className="customer-change-email-button"
                onClick={() => {
                  setShowPopup(false);
                  setEmailError("");
                }}
              >
                Change Email Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerRegistration;