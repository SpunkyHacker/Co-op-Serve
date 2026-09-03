import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages (matching your directory structure)
import LandingPage from './pages/LandingPage';
import UserLogin from './pages/UserLogin';
import WorkerLogin from './pages/WorkerLogin';
import WorkerSearch from './pages/WorkerSearch';

import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* If you have a persistent Navbar, you can put it here above Routes */}
        
        <Routes>
          {/* Default route loads your landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth routes */}
          <Route path="/login/user" element={<UserLogin />} />
          <Route path="/login/worker" element={<WorkerLogin />} />
          
          {/* Your new Cooperative Ranking Search Dashboard */}
          <Route path="/search" element={<WorkerSearch />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;