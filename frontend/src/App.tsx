import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import { RegistrationPage } from "./pages/Registration/RegistrationPage";
import { VerificationStatusPage } from "./pages/Registration/VerificationStatusPage";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminSectionPage from "./pages/admin/SectionPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/registration/verification" element={<VerificationStatusPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/:section" element={<AdminSectionPage />} />
      </Routes>
    </BrowserRouter>
  );
}
