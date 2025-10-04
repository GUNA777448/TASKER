import React from "react";
import { Link } from "react-router-dom";
import LoginPage from "./LoginPage";

const MainPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center">
      <div className="max-w-6xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Branding */}
        <div className="text-white flex flex-col justify-center">
          <h1 className="text-6xl font-extrabold tracking-tight drop-shadow-lg">TASKER</h1>
          <p className="mt-4 text-lg opacity-90">Organize work. Ship faster. Collaborate effortlessly.</p>
          <p className="mt-2 text-sm opacity-80">Boards, members, notes and simple workflows — built for small teams.</p>

          <div className="mt-8 space-y-3">
            <div className="inline-flex items-center gap-3">
              <span className="bg-white/10 px-3 py-1 rounded-full text-sm">Teams</span>
              <span className="bg-white/10 px-3 py-1 rounded-full text-sm">Notes</span>
              <span className="bg-white/10 px-3 py-1 rounded-full text-sm">Realtime</span>
            </div>
            <Link to="/signup" className="inline-block mt-4 bg-white text-blue-700 px-5 py-3 rounded-xl font-semibold shadow hover:opacity-95 w-max">Get Started</Link>
          </div>
        </div>

        {/* Right: Login panel (embedded) */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome back</h2>
          <p className="text-gray-600 text-sm mb-6">Sign in to your account</p>
          {/* Reuse LoginPage form by embedding its component */}
          <LoginPage />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
