import React from "react";
import { Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";

const MainPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center py-12">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Branding */}
          <div className="text-white flex flex-col justify-center px-2 md:px-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight drop-shadow-lg leading-tight">
              TASKER
            </h1>
            <p className="mt-4 text-base sm:text-lg md:text-xl opacity-90">
              Organize work. Ship faster. Collaborate effortlessly.
            </p>
            <p className="mt-2 text-sm sm:text-base opacity-80 max-w-lg">
              Boards, members, notes and simple workflows — built for small teams.
            </p>

            <div className="mt-6 sm:mt-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs sm:text-sm">Teams</span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs sm:text-sm">Notes</span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs sm:text-sm">Realtime</span>
              </div>
              <Link to="/signup" className="inline-block mt-3 sm:mt-4 bg-white text-blue-700 px-4 sm:px-5 py-2.5 rounded-xl font-semibold shadow hover:opacity-95 w-max">
                Get Started
              </Link>
            </div>
          </div>

          {/* Right: Login panel (embedded) */}
          <div className="flex justify-center lg:justify-end px-2">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-white/20">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-gray-600 text-sm mb-4">Sign in to your account</p>
              <LoginForm compact={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
