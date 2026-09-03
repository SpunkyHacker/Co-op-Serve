import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function WorkerLogin() {
  const [step, setStep] = useState('request'); // 'request' or 'verify'
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');

 // handlig the seding email to the backend
    const handleSendOtp = async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: contact, role: 'worker' })
    });

    const data = await response.json();

    if (data.success) {
      setStep('verify'); // Move to OTP entry screen
    } else {
      alert('Failed to send OTP: ' + data.message);
    }
  } catch (error) {
    console.error('Error connecting to backend:', error);
  }
};
// handling the sending of the opt to check. 
const handleVerify = async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: contact, otp: otp, role: 'worker' })
    });

    const data = await response.json();

    if (data.success) {
      alert('Login successful! Token: ' + data.token);
      // Here you will save data.token to localStorage and redirect to Dashboard
    } else {
      alert('Invalid OTP: ' + data.message);
    }
  } catch (error) {
    console.error('Error connecting to backend:', error);
  }
};

  // Basic inline styles for a clean, centered card look
  const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' },
    card: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
    input: { width: '100%', padding: '12px', margin: '10px 0', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    buttonPrimary: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
    buttonGoogle: { width: '100%', padding: '12px', backgroundColor: '#white', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px' },
    divider: { display: 'flex', alignItems: 'center', margin: '20px 0', color: '#666', fontSize: '14px' },
    line: { flex: 1, height: '1px', backgroundColor: '#ccc' },
    link: { color: '#2563eb', textDecoration: 'none', fontSize: '14px', marginTop: '20px', display: 'inline-block' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Worker Login</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Find your next gig today.</p>

        {step === 'request' ? (
          <>
            <button style={styles.buttonGoogle} onClick={() => alert('Google Auth Triggered')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google logo" width="18" />
              Continue with Google
            </button>

            <div style={styles.divider}>
              <div style={styles.line}></div>
              <span style={{ padding: '0 10px' }}>or use email/phone</span>
              <div style={styles.line}></div>
            </div>

            <form onSubmit={handleSendOtp}>
              <input 
                type="text" 
                placeholder="Email or Phone Number" 
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                style={styles.input}
                required
              />
              <button type="submit" style={styles.buttonPrimary}>Send OTP</button>
            </form>
          </>
        ) : (
          <>
            <p>We sent a code to <strong>{contact}</strong></p>
            <form onSubmit={handleVerify}>
              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={styles.input}
                maxLength="6"
                required
              />
              <button type="submit" style={styles.buttonPrimary}>Verify & Login</button>
            </form>
            <button onClick={() => setStep('request')} style={{ ...styles.link, background: 'none', border: 'none', cursor: 'pointer' }}>
              &larr; Use a different number
            </button>
          </>
        )}

        <div>
          <Link to="/" style={styles.link}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}