import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages
import LandingPage from './pages/LandingPage';
import UserLogin from './pages/UserLogin';
import WorkerLogin from './pages/WorkerLogin';
import WorkerSearch from './pages/WorkerSearch';
import WorkerDashboard from './pages/WorkerDashboard';
import BookingFlow from './pages/BookingFlow'; // Added customer tracking & flow view

import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Default route loads your landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth routes */}
          <Route path="/user-login" element={<UserLogin />} />
          <Route path="/worker-login" element={<WorkerLogin />} />
          
          {/* Core platform routes */}
          <Route path="/search" element={<WorkerSearch />} />
          <Route path="/booking" element={<BookingFlow />} />     {/* Customer 4-step tracking */}
          <Route path="/worker" element={<WorkerDashboard />} />   {/* Worker incoming job view */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;