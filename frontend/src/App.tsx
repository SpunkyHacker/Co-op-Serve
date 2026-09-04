import { useLocation } from "react-router-dom";

import CustomerLogin from "./pages/CustomerLogin";
import WorkerLogin from "./pages/WorkerLogin";
import LandingPage from "./pages/LandingPage";
import CustomerRegistration from "./pages/CustomerRegistration";
import CustomerDashboard from "./pages/CustomerDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerRegistration from "./pages/WorkerRegistration";

import "./App.css";

function App() {
  const location = useLocation();

  // Get the current URL path
  const path = location.pathname;

  // =========================================
  // CUSTOMER LOGIN
  // =========================================

  if (path === "/customer-login") {
    return <CustomerLogin />;
  }

  // =========================================
  // CUSTOMER REGISTRATION
  // =========================================

  if (path === "/customer-registration") {
    return <CustomerRegistration />;
  }
  // =========================================
  // Worker REGISTRATION
  // =========================================

  if (path === "/worker-registration") {
    return <WorkerRegistration />;
  }

  // =========================================
  // WORKER LOGIN
  // =========================================

  if (path === "/worker-login") {
    return <WorkerLogin />;
  }

  if(path === "/customer-dashboard"){
    return <CustomerDashboard/>
  }
    if(path === "/worker-dashboard"){
    return <WorkerDashboard/>
  }
  // =========================================
  // LANDING PAGE
  // =========================================

  return <LandingPage />;
}

export default App;