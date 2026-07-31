import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import { RegistrationPage } from "./pages/Registration/RegistrationPage";
import { VerificationStatusPage } from "./pages/Registration/VerificationStatusPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/registration/verification" element={<VerificationStatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}
