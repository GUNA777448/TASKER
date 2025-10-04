import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "../../contexts/toast";
import {
  getSpaceById,
  getSpaceTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getSpaceMembers,
  getSpaceNotes,
  updateSpaceNotes,
  subscribeToSpaceNotes,
} from "../../../firebase/Space_management";
import ConfirmDialog from "../../components/ConfirmDialog";

const UserSpacePage = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [user, setUser] = useState(null);
  const [space, setSpace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    taskName: "",
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
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Authentication and data fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        try {
          const spaceData = await getSpaceById(spaceId, currentUser.uid);
          setSpace(spaceData);

          const spaceTasks = await getSpaceTasks(spaceId);
          setTasks(spaceTasks);

          const members = await getSpaceMembers(spaceId, currentUser.uid);
          setSpaceMembers(members);

          try {
            const spaceNotes = await getSpaceNotes(spaceId, currentUser.uid);
            setNotes(spaceNotes);
          } catch (notesErr) {
            console.error("Error fetching notes:", notesErr);
          }
        } catch (err) {
          console.error("Error fetching space data:", err);
        }

        setLoading(false);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [spaceId, navigate]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-gray-600 mx-auto mb-4"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          <p className="text-gray-600">Loading space...</p>
        </div>
      </div>
    );
  }

  // If no space (access denied or not found)
  if (!space) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Space Not Found
          </h1>
          <Link
            to="/user/dashboard"
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Helper to find member details for display by assignee
  const getMemberByAssignee = (assigneeName) => {
    return spaceMembers.find(
      (m) => m.username === assigneeName || m.email === assigneeName
    );
  };

  const handleOpenTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate || "",
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
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      assignee: "",
      dueDate: "",
      tags: "",
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
        dueDate: taskForm.dueDate || null,
        tags: taskForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
        status: "todo",
      };

      if (editingTask) {
        // Simple client-side update for now (server-side update not present in helper)
        // Update status/progress handled separately via updateTaskStatus
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t))
        );
        showSuccess(`Task "${taskData.title}" updated locally`);
      } else {
        const newTask = await createTask(spaceId, taskData, user.uid);
        setTasks((prev) => [...prev, newTask]);
        showSuccess(`Task "${taskData.title}" created`);

        setSpace((prev) => ({ ...prev, tasks: (prev?.tasks || 0) + 1 }));
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

  const handleDeleteTask = (taskId) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    const taskName = taskToDelete?.title || "task";

    setConfirmDialog({
      isOpen: true,
      title: "Delete Task",
      message: `Are you sure you want to delete the task "${taskName}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteTask(taskId, spaceId);
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          showSuccess(`Task "${taskName}" deleted`);
          setSpace((prev) => ({
            ...prev,
            tasks: Math.max(0, (prev?.tasks || 1) - 1),
          }));
        } catch (err) {
          console.error("Error deleting task:", err);
          showError("Failed to delete task");
        }
      },
      taskName,
    });
  };

  const handleProgressUpdate = (taskId, newProgress) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, progress: newProgress } : task
      )
    );
  };

  // Notes handling (copied behavior from admin SpacePage)
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleNotesSave = async () => {
    if (!user?.uid) return;

    setNotesSaving(true);
    try {
      await updateSpaceNotes(spaceId, notes, user.uid);
      showSuccess("Notes saved successfully");
    } catch (error) {
      console.error("Error saving notes:", error);
      showError("Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  // Drag and Drop functionality
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    handleStatusChange(taskId, newStatus);
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
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 hover:shadow-md transition-all duration-200 cursor-move"
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-800 text-sm leading-5 flex-1 pr-2">
          {task.title}
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenTaskModal(task)}
            className="text-gray-400 hover:text-blue-600 text-sm p-1 rounded hover:bg-blue-50"
            title="Edit task"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="text-gray-400 hover:text-red-600 text-sm p-1 rounded hover:bg-red-50"
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

      {task.status === "in-progress" && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={task.progress}
            onChange={(e) =>
              handleProgressUpdate(task.id, parseInt(e.target.value))
            }
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm py-3 sm:py-4 px-4 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Link
              to="/user/dashboard"
              className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {space?.name || "Space"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                {space?.members || 0} members • {tasks.length} tasks • Role:{" "}
                {space?.userRole || "Member"}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium text-center">
              ✅ Full Task Access
            </div>
            <button
              onClick={() => handleOpenTaskModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg shadow transition text-sm sm:text-base"
            >
              + Add Task
            </button>
          </div>
        </div>
      </header>

      {/* Task Board with Notes */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* To-Do Column */}
          <div
            className="bg-gray-100 rounded-lg p-4 min-h-96"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "todo")}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">To-Do</h2>
              <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
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
            className="bg-blue-50 rounded-lg p-4 min-h-96"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "in-progress")}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">In Progress</h2>
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
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
            className="bg-green-50 rounded-lg p-4 min-h-96"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "completed")}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Completed</h2>
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
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

          {/* Notes Section (right column) */}
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
              <textarea
                value={notes}
                onChange={handleNotesChange}
                onBlur={handleNotesSave}
                placeholder={
                  "Add notes for this space... \n• Meeting notes\n• Important reminders  \n• Project updates\n• Team announcements"
                }
                className="w-full h-64 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-gray-700 text-sm leading-relaxed"
                style={{ fontFamily: "inherit" }}
              />

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
                <div className="text-gray-400">{notes.length} characters</div>
              </div>

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
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingTask ? "Edit Task" : "Create New Task"}
              </h3>
              <button
                onClick={handleCloseTaskModal}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                <input
                  type="text"
                  name="assignee"
                  value={taskForm.assignee}
                  onChange={handleTaskFormChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Assign to team member..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Notify Assignee
                  </label>
                  <p className="text-xs text-gray-500">
                    Send notification to the assignee when the task is created
                    or updated.
                  </p>
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

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseTaskModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
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
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
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

export default UserSpacePage;
