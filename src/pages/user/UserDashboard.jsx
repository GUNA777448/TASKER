import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getUserSpaces,
  getSpaceTasks,
} from "../../../firebase/Space_management";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalSpaces: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
  });

  // Fetch user spaces and tasks
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch user spaces
          const userSpaces = await getUserSpaces(currentUser.uid);
          setSpaces(userSpaces);

          // Fetch all tasks from all user spaces
          let allUserTasks = [];
          for (const space of userSpaces) {
            try {
              const spaceTasks = await getSpaceTasks(space.id);
              // Add space info to each task
              const tasksWithSpaceInfo = spaceTasks.map((task) => ({
                ...task,
                spaceName: space.name,
                spaceId: space.id,
              }));
              allUserTasks = [...allUserTasks, ...tasksWithSpaceInfo];
            } catch (spaceTaskError) {
              console.error(
                `Error fetching tasks for space ${space.id}:`,
                spaceTaskError
              );
            }
          }
          setAllTasks(allUserTasks);

          // Calculate statistics
          const completedTasks = allUserTasks.filter(
            (task) => task.status === "completed"
          );
          const inProgressTasks = allUserTasks.filter(
            (task) => task.status === "in-progress"
          );

          setStats({
            totalSpaces: userSpaces.length,
            totalTasks: allUserTasks.length,
            completedTasks: completedTasks.length,
            inProgressTasks: inProgressTasks.length,
          });
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to load dashboard data");
        }
      } else {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Helper function to get user role in space
  const getUserRoleInSpace = (space) => {
    if (space.adminId === user?.uid) {
      return "Admin";
    }
    return "Member";
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 py-6 sm:py-8 px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
              Welcome back,{" "}
              {user?.displayName || user?.email?.split("@")[0] || "User"}!
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base flex items-center gap-2">
              <svg
                className="w-4 h-4 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H5m14 0v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5"
                />
              </svg>
              Manage your tasks across {stats.totalSpaces} assigned spaces
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">Welcome back!</p>
              <p className="text-xs text-gray-500">User Dashboard</p>
            </div>
            <Link
              to="/profile"
              className="group flex items-center gap-3 px-4 sm:px-5 py-3 text-gray-700 hover:text-indigo-600 bg-white/60 hover:bg-white/80 backdrop-blur-sm rounded-xl border-2 border-transparent hover:border-indigo-200 shadow-md hover:shadow-lg transition-all duration-300 text-sm sm:text-base transform hover:scale-105"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                U
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">My Profile</p>
                <p className="text-xs text-gray-500 hidden sm:block">
                  View & Edit
                </p>
              </div>
              <svg
                className="w-4 h-4 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">My Spaces</p>
                <p className="text-3xl font-bold mt-1">{stats.totalSpaces}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H5m14 0v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Total Tasks
                </p>
                <p className="text-3xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Completed Tasks
                </p>
                <p className="text-3xl font-bold mt-1">
                  {stats.completedTasks}
                </p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spaces Section */}
      <main className="max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Your Assigned Spaces
              </h2>
              <p className="text-gray-600 mt-1">
                Collaborate and manage tasks across your workspaces
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm bg-blue-50 p-4 rounded-xl border border-blue-200">
            💡 <strong>Tip:</strong> Click on any space to view and manage
            tasks. You can create, edit, and organize tasks within each
            workspace based on your role permissions.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {spaces.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H5m14 0v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Spaces Yet
              </h3>
              <p className="text-gray-600">
                You haven't been added to any spaces yet. Contact your team
                admin to get access.
              </p>
            </div>
          ) : (
            spaces.map((space) => {
              const spaceTasks = allTasks.filter(
                (task) => task.spaceId === space.id
              );
              const completedSpaceTasks = spaceTasks.filter(
                (task) => task.status === "completed"
              );
              const progressPercentage =
                spaceTasks.length > 0
                  ? Math.round(
                      (completedSpaceTasks.length / spaceTasks.length) * 100
                    )
                  : 0;

              return (
                <Link
                  key={space.id}
                  to={`/user/space/${space.id}`}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl p-6 hover:bg-white/90 transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95 border border-white/50 hover:border-indigo-200"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        {space.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors duration-200">
                          {space.name}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {space.description || "No description available"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          getUserRoleInSpace(space) === "Admin"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {getUserRoleInSpace(space)}
                      </span>
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg
                          className="w-4 h-4 text-blue-600 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                      </div>
                      <span className="text-xl font-bold text-blue-600">
                        {spaceTasks.length}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">Tasks</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg
                          className="w-4 h-4 text-green-600 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                          />
                        </svg>
                      </div>
                      <span className="text-xl font-bold text-green-600">
                        {space.memberCount || space.members?.length || 1}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">Members</p>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                          />
                        </svg>
                        Completion
                      </span>
                      <span className="font-semibold text-indigo-600">
                        {progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-purple-700"
                        style={{
                          width: `${progressPercentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>{" "}
        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">💡</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {spaces.length === 0
                  ? "Getting Started"
                  : "Task Management Tips"}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {spaces.length === 0
                  ? "Contact your team administrator to get added to spaces where you can collaborate on tasks and projects."
                  : "You can create, edit, assign, and track tasks within each space. Use the drag-and-drop interface to move tasks between different stages."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {spaces.length === 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-gray-700">Ask Administrator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-gray-700">Check Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span className="text-gray-700">Contact Team Lead</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-gray-700">Create & Edit Tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-gray-700">Track Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span className="text-gray-700">
                        Collaborate with Team
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
