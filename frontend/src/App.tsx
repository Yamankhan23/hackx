import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import { RegistrationPage } from "./pages/Registration/RegistrationPage";
import { ResumePage } from "./pages/Registration/ResumePage";
import { VerificationStatusPage } from "./pages/Registration/VerificationStatusPage";
import { VerifyEmailPage } from "./pages/Registration/VerifyEmailPage";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminSectionPage from "./pages/admin/SectionPage";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/ui/Toast";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/registration/verification" element={<VerificationStatusPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/:section" element={<AdminSectionPage />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ToastProvider>
  );
}
