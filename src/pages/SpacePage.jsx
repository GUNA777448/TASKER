import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "../contexts/toast";
import {
  getSpaceById,
  getSpaceTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  syncUserSpaces,
  getSpaceMembers,
  getSpaceNotes,
  updateSpaceNotes,
  subscribeToSpaceNotes,
} from "../../firebase/Space_management";
import MembersManagement from "../components/MembersManagement";
import ConfirmDialog from "../components/ConfirmDialog";

const SpacePage = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  // State management
  const [user, setUser] = useState(null);
  const [space, setSpace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [notes, setNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    taskName: ""
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    dueDate: "",
    tags: "",
    notifyMember: true,
  });

  // Helper function to get member details by assignee name
  const getMemberByAssignee = (assigneeName) => {
    return spaceMembers.find(
      (member) =>
        member.username === assigneeName || member.email === assigneeName
    );
  };

  // Function to refresh space data
  const refreshSpaceData = async () => {
    // Force check current auth state
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log("Refreshing space data for user:", currentUser.uid);
      setUser(currentUser);

      try {
        // Force re-fetch space data with current user
        const spaceData = await getSpaceById(spaceId, currentUser.uid);
        setSpace(spaceData);

        // Force re-fetch tasks
        const spaceTasks = await getSpaceTasks(spaceId);
        setTasks(spaceTasks);

        // Fetch space members for assignee dropdown
        const members = await getSpaceMembers(spaceId, currentUser.uid);
        setSpaceMembers(members);

        showSuccess("Space data refreshed successfully");
        console.log("Space data refreshed successfully");
      } catch (err) {
        console.error("Error refreshing space data:", err);
        showError("Failed to refresh space data");
      }
    }

    // Also trigger the normal refresh mechanism
    setRefreshTrigger((prev) => prev + 1);
  };

  // Function to handle member addition and refresh members list
  const handleMemberAdded = async () => {
    await refreshSpaceData();
    // Also refresh just the members list independently
    if (user && spaceId) {
      try {
        const updatedMembers = await getSpaceMembers(spaceId, user.uid);
        setSpaceMembers(updatedMembers);
      } catch (err) {
        console.error("Error refreshing members for dropdown:", err);
        showError("Failed to refresh member list");
      }
    }
  };

  // Authentication and data fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Skip data fetching if we're in the middle of adding a member
        if (isAddingMember) {
          console.log("Skipping data fetch during member addition process");
          return;
        }

        try {
          // Fetch space data
          const spaceData = await getSpaceById(spaceId, currentUser.uid);
          setSpace(spaceData);

          // Fetch tasks for this space
          const spaceTasks = await getSpaceTasks(spaceId);
          setTasks(spaceTasks);

          // Fetch space members for assignee dropdown
          const members = await getSpaceMembers(spaceId, currentUser.uid);
          setSpaceMembers(members);

          // Fetch initial notes
          try {
            const spaceNotes = await getSpaceNotes(spaceId, currentUser.uid);
            setNotes(spaceNotes);
          } catch (notesErr) {
            console.error("Error fetching notes:", notesErr);
          }
        } catch (err) {
          console.error("Error fetching space data:", err);
          // Simply log the error without blocking the UI
        }
        setLoading(false);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [spaceId, navigate, refreshTrigger, isAddingMember]);

  // Real-time notes subscription
  useEffect(() => {
    if (!spaceId) return;

    const unsubscribeNotes = subscribeToSpaceNotes(spaceId, (updatedNotes) => {
      setNotes(updatedNotes);
    });

    return () => unsubscribeNotes();
  }, [spaceId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 text-lg">Loading space...</p>
        </div>
      </div>
    );
  }

  // Safety check - if no space data and no error, keep loading
  if (!space) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 text-lg">Loading space...</p>
        </div>
      </div>
    );
  }

  // Task modal handlers
  const handleOpenTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        tags: Array.isArray(task.tags) ? task.tags.join(", ") : "",
        notifyMember: true,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        priority: "medium",
        assignee: "",
        dueDate: "",
        tags: "",
        notifyMember: true,
      });
    }
    setShowTaskModal(true);
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setCreatingTask(false);
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      assignee: "",
      dueDate: "",
      tags: "",
      notifyMember: true,
    });
  };

  const handleTaskFormChange = (e) => {
    const { name, value } = e.target;
    setTaskForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    setCreatingTask(true);

    try {
      const taskData = {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assignee: taskForm.assignee,
        dueDate: taskForm.dueDate,
        tags: taskForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        status: "todo",
      };

      if (editingTask) {
        // TODO: Add update task functionality
        console.log("Update task functionality to be implemented");
      } else {
        // Create new task
        const newTask = await createTask(spaceId, taskData, user.uid);
        setTasks((prev) => [...prev, newTask]);
        showSuccess(`Task "${taskData.title}" created successfully`);

        // Update space task count
        setSpace((prev) => ({
          ...prev,
          tasks: (prev.tasks || 0) + 1,
        }));
      }

      handleCloseTaskModal();
    } catch (err) {
      console.error("Error saving task:", err);
      showError("Failed to save task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus,
                progress:
                  newStatus === "completed"
                    ? 100
                    : newStatus === "in-progress"
                    ? 50
                    : 0,
              }
            : task
        )
      );
    } catch (err) {
      console.error("Error updating task status:", err);
      showError("Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId) => {
    // Find task name for better toast message
    const taskToDelete = tasks.find(task => task.id === taskId);
    const taskName = taskToDelete?.title || "task";
    
    setConfirmDialog({
      isOpen: true,
      title: "Delete Task",
      message: `Are you sure you want to delete the task "${taskName}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteTask(taskId, spaceId);
          setTasks((prev) => prev.filter((task) => task.id !== taskId));
          showSuccess(`Task "${taskName}" deleted successfully`);

          // Update space task count
          setSpace((prev) => ({
            ...prev,
            tasks: Math.max(0, (prev.tasks || 1) - 1),
          }));
        } catch (err) {
          console.error("Error deleting task:", err);
          showError("Failed to delete task");
        }
      },
      taskName
    });
  };

  // Drag and Drop functionality
  const handleDragStart = (e, taskId) => {
    console.log("Drag started for task:", taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    console.log("Dropped task:", taskId, "to status:", newStatus);
    if (taskId) {
      handleStatusChange(taskId, newStatus);
    }
  };

  // Notes handling
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleNotesSave = async () => {
    if (!user?.uid) return;

    setNotesSaving(true);
    try {
      await updateSpaceNotes(spaceId, notes, user.uid);
      showSuccess("Notes saved successfully");
      console.log("Notes saved successfully");
    } catch (error) {
      console.error("Error saving notes:", error);
      showError("Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  const todoTasks = tasks.filter((task) => task.status === "todo");
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const TaskCard = ({ task }) => (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-4 mb-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-move"
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-800 text-sm leading-5">
          {task.title}
        </h4>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => handleOpenTaskModal(task)}
            className="text-gray-400 hover:text-blue-600 text-sm p-1"
            title="Edit task"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="text-gray-400 hover:text-red-600 text-sm p-1"
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mb-2">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
            task.priority
          )}`}
        >
          {task.priority.toUpperCase()}
        </span>
        {task.dueDate && (
          <span className="text-xs text-gray-500">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {task.assignee && (
        <div className="flex items-center mb-2">
          {(() => {
            const memberDetails = getMemberByAssignee(task.assignee);
            const displayName = memberDetails?.username || task.assignee;
            const isAdmin = memberDetails?.isAdmin || false;

            return (
              <>
                <div
                  className={`w-6 h-6 ${
                    isAdmin
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500"
                  } rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm`}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="ml-2 text-xs text-gray-600">
                  {displayName}
                  {isAdmin && (
                    <span className="ml-1 text-purple-600 font-medium">
                      (Admin)
                    </span>
                  )}
                </span>
              </>
            );
          })()}
        </div>
      )}

      {task.status === "in-progress" && task.progress > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(task.id, e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="todo">To-Do</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-xs text-gray-400">
          Created: {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg py-4 px-6 border-b border-white/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/50 font-medium text-sm sm:text-base transition-all duration-200 rounded-xl border-2 border-gray-200 hover:border-indigo-300 backdrop-blur-sm bg-white/60 hover:shadow-md hover:scale-105"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </Link>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {space.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                {space.members || 0} members • {tasks.length} tasks
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === "tasks"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Tasks
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full">
                  {tasks.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === "members"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Members
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full">
                  {space?.members || 0}
                </span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {activeTab === "tasks" && (
          <div>
            {/* Add Task Button - Moved inside tasks tab */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => handleOpenTaskModal()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 text-sm sm:text-base flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Task
              </button>
            </div>

            {/* Task Board with Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* To-Do Column */}
              <div
                className={`bg-white/70 backdrop-blur-sm rounded-2xl p-6 min-h-96 shadow-lg border transition-all duration-200 ${
                  dragOverColumn === "todo"
                    ? "border-blue-400 bg-blue-50/30 scale-[1.02]"
                    : "border-white/20"
                }`}
                onDragOver={(e) => handleDragOver(e, "todo")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "todo")}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-gray-800 text-lg">To-Do</h2>
                  <span className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    {todoTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {todoTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {todoTasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No tasks in To-Do</p>
                      <button
                        onClick={() => handleOpenTaskModal()}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                      >
                        Add your first task
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* In Progress Column */}
              <div
                className={`bg-blue-50/70 backdrop-blur-sm rounded-2xl p-6 min-h-96 shadow-lg border transition-all duration-200 ${
                  dragOverColumn === "in-progress"
                    ? "border-blue-400 bg-blue-100/50 scale-[1.02]"
                    : "border-blue-100/50"
                }`}
                onDragOver={(e) => handleDragOver(e, "in-progress")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "in-progress")}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-gray-800 text-lg">
                    In Progress
                  </h2>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    {inProgressTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {inProgressTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {inProgressTasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No tasks in progress</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed Column */}
              <div
                className={`bg-green-50/70 backdrop-blur-sm rounded-2xl p-6 min-h-96 shadow-lg border transition-all duration-200 ${
                  dragOverColumn === "completed"
                    ? "border-green-400 bg-green-100/50 scale-[1.02]"
                    : "border-green-100/50"
                }`}
                onDragOver={(e) => handleDragOver(e, "completed")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "completed")}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-gray-800 text-lg">Completed</h2>
                  <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    {completedTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {completedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {completedTasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No completed tasks</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-amber-50/70 backdrop-blur-sm rounded-2xl p-6 min-h-96 shadow-lg border border-amber-100/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-800 text-lg">Notes</h2>
                    <svg
                      className="w-5 h-5 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  {notesSaving && (
                    <div className="flex items-center text-amber-600 text-sm">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Notes Textarea */}
                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    onBlur={handleNotesSave}
                    placeholder="Add notes for this space... 
• Meeting notes
• Important reminders  
• Project updates
• Team announcements"
                    className="w-full h-64 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-gray-700 text-sm leading-relaxed"
                    style={{ fontFamily: "inherit" }}
                  />

                  {/* Notes Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Auto-saves on focus loss</span>
                    </div>
                    <div className="text-gray-400">
                      {notes.length} characters
                    </div>
                  </div>

                  {/* Manual Save Button */}
                  <button
                    onClick={handleNotesSave}
                    disabled={notesSaving}
                    className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2"
                  >
                    {notesSaving ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving Notes...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        Save Notes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <MembersManagement
            spaceId={spaceId}
            userId={user?.uid}
            isAdmin={space?.adminId === user?.uid}
            onMemberAdded={handleMemberAdded}
            onMemberAddingStart={() => {
              setIsAddingMember(true);
              // Safety timeout to clear flag after 30 seconds
              setTimeout(() => {
                setIsAddingMember(false);
                console.log("Cleared isAddingMember flag after timeout");
              }, 30000);
            }}
            onMemberAddingEnd={() => setIsAddingMember(false)}
          />
        )}
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {editingTask ? "Edit Task" : "Create New Task"}
              </h3>
              <button
                onClick={handleCloseTaskModal}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleTaskFormChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="Enter task title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleTaskFormChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows={4}
                  placeholder="Describe the task..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={taskForm.dueDate}
                    onChange={handleTaskFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </label>
                <select
                  name="assignee"
                  value={taskForm.assignee}
                  onChange={handleTaskFormChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select team member...</option>
                  {spaceMembers.map((member) => (
                    <option
                      key={member.uid}
                      value={member.username || member.email}
                    >
                      {member.username || member.email}
                      {member.isAdmin && " (Admin)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={taskForm.tags}
                  onChange={handleTaskFormChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="frontend, urgent, bug..."
                />
              </div>

              {/* Notification Toggle */}
              {taskForm.assignee && (
                <div className="bg-blue-50/50 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-5 5-5-5h5v-3h-5l5-5 5 5h-5v3z"
                          />
                        </svg>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Notify Assignee
                          </label>
                          <p className="text-xs text-gray-500">
                            Send notification to {taskForm.assignee} about this task assignment
                          </p>
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="notifyMember"
                        checked={taskForm.notifyMember}
                        onChange={(e) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            notifyMember: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseTaskModal}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-medium flex items-center gap-2 hover:scale-105 disabled:hover:scale-100"
                >
                  {creatingTask && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default SpacePage;
