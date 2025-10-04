import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/admin/Dashboard";
import SpacePage from "./pages/SpacePage";
import UserDashboard from "./pages/user/UserDashboard";
import UserSpacePage from "./pages/user/UserSpacePage";
import ProfilePage from "./pages/ProfilePage";
import MainPage from "./pages/MainPage";
import "./App.css";
import ErrorPage from "./pages/ErrorPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Admin Routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/space/:spaceId" element={<SpacePage />} />
      <Route path="/profile" element={<ProfilePage />} />

      {/* User Routes */}
      <Route path="/user/dashboard" element={<UserDashboard />} />
      <Route path="/user/space/:spaceId" element={<UserSpacePage />} />
      <Route path="/user/profile" element={<ProfilePage />} />

      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}

export default App;
