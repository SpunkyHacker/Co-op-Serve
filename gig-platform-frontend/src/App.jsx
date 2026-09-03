import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import WorkerLogin from './pages/WorkerLogin';
import UserLogin from './pages/UserLogin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Landing Page loads on the default path "/" */}
        <Route path="/" element={<LandingPage />} />
        
        {/* The specific login routes */}
        <Route path="/worker-login" element={<WorkerLogin />} />
        <Route path="/user-login" element={<UserLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;