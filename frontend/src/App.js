import { BrowserRouter, Routes, Route } from "react-router-dom";
import Intro from "./pages/Intro";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import DonorDashboard from "./pages/DonorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  return (
    <BrowserRouter>
      {/* GLOBAL FULL-PAGE WRAPPER */}
      <div className="min-h-screen w-full bg-gray-100">
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/roles" element={<RoleSelect />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/register/:role" element={<Register />} />
          <Route path="/user" element={<UserDashboard />} />
          <Route path="/donor" element={<DonorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/forgot-password/:role" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}
