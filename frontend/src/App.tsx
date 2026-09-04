import { useLocation } from "react-router-dom";

import CustomerLogin from "./pages/CustomerLogin";
import WorkerLogin from "./pages/WorkerLogin";
import LandingPage from "./pages/LandingPage";
import CustomerRegistration from "./pages/CustomerRegistration";
import UserDashboard from "./pages/UserDashboard";

import "./App.css";

function App() {
  const location = useLocation();

  const path = location.pathname;

  if (path === "/customer-login") {
    return <CustomerLogin />;
  }

  if (path === "/customer-registration") {
    return <CustomerRegistration />;
  }

  if (path === "/worker-login") {
    return <WorkerLogin />;
  }

  if (path === "/user-dashboard") {
    return <UserDashboard />;
  }

  return <LandingPage />;
}

export default App;