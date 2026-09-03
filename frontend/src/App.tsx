import { useLocation } from "react-router-dom";

import CustomerLogin from "./pages/CustomerLogin";
import WorkerLogin from "./pages/WorkerLogin";
import LandingPage from "./pages/LandingPage";

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
  // WORKER LOGIN
  // =========================================

  if (path === "/worker-login") {
    return <WorkerLogin />;
  }

  // =========================================
  // LANDING PAGE
  // =========================================

  return <LandingPage />;
}

export default App;