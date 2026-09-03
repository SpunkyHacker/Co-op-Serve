import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Co-op</h1>
      <p>Connecting top-tier gig workers with the people who need them.</p>
      
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Route to the Worker Login */}
        <Link to="/worker-login">
          <button style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}>
            I am a Gig Worker
          </button>
        </Link>
        

        {/* Route to the User/Client Login */}
        <Link to="/user-login">
          <button style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}>
            I want to Hire
          </button>
        </Link>

        {/* Route to the Cooperative Search Dashboard */}
        <Link to="/search">
          <button style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            fontSize: '16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}>
            Find Cooperative Workers
          </button>
        </Link>
      </div>
    </div>
  );
}