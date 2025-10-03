import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "../contexts/toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user", // Keep for demo buttons
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Get user data from Firestore to determine role
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data:", userData);
        showSuccess(`Welcome back, ${userData.username || user.email}!`);
        // Navigate based on user role from Firestore
        if (userData.role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      } else {
        // Fallback if user document doesn't exist
        showSuccess(`Welcome back, ${user.email}!`);
        navigate("/user/dashboard");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      showError(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo functions for testing without authentication
  const handleDemoLogin = (role) => {
    if (role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/user/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 px-4 sm:px-6 lg:px-8">
      {/* Company Title */}
      <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-2xl tracking-tight">
          TASKER
        </h1>
        <p className="text-white/80 text-base sm:text-lg mt-2 font-medium px-4">
          Manage Your Tasks Efficiently
        </p>
      </div>

      <div className="flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Sign in to your account
              </p>
            </div>

            {/* Form */}
            <form
              className="mt-6 sm:mt-8 space-y-4 sm:space-y-6"
              onSubmit={handleSubmit}
            >
              <div className="space-y-4">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>

              {/* Demo Access Buttons */}
              {/* <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("user")}
                  className="w-full sm:flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors duration-200"
                >
                  Demo: User Access
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("admin")}
                  className="w-full sm:flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors duration-200"
                >
                  Demo: Admin Access
                </button>
              </div> */}

              {/* Toggle to Signup */}
              {/* <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                  >
                    Sign up
                  </Link>
                </p>
              </div> */}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
