import React, { useState, useEffect } from "react";
import {
  addMemberToSpace,
  getSpaceMembers,
  removeMemberFromSpace,
  syncUserSpaces,
} from "../../firebase/Space_management.js";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { useToast } from "../contexts/toast";
import ConfirmDialog from "./ConfirmDialog";

const MembersManagement = ({
  spaceId,
  userId,
  isAdmin,
  onMemberAdded,
  onMemberAddingStart,
  onMemberAddingEnd,
}) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    email: "",
    password: "",
    username: "",
    adminPassword: "",
    notifyMember: true,
  });
  const [authStateStable, setAuthStateStable] = useState(true);
  const [skipFetching, setSkipFetching] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    memberInfo: null
  });

  // Monitor authentication state to detect unexpected logouts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.uid === userId) {
        // Admin is still logged in - stable state
        setAuthStateStable(true);
      } else if (!user) {
        // User has been logged out unexpectedly
        console.warn("Admin has been logged out unexpectedly");
        showWarning("Admin session was interrupted");
        setAuthStateStable(false);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Fetch space members
  useEffect(() => {
    const fetchMembers = async () => {
      // Skip fetching if we're in the middle of adding a member
      if (skipFetching) {
        console.log("Skipping members fetch during member addition");
        return;
      }

      try {
        setLoading(true);
        const membersData = await getSpaceMembers(spaceId, userId);
        setMembers(membersData);
      } catch (err) {
        console.error("Error fetching members:", err);

        // If access denied, try to sync user spaces and retry
        if (err.message.includes("Access denied")) {
          try {
            console.log("Attempting to sync user spaces...");
            showInfo("Syncing user access...");
            await syncUserSpaces(userId);
            const retryMembersData = await getSpaceMembers(spaceId, userId);
            setMembers(retryMembersData);
            showSuccess("Member list loaded successfully");
          } catch (retryErr) {
            console.error("Retry failed:", retryErr);
            showError("Failed to load members after sync retry");
          }
        } else {
          showError("Failed to load members");
        }
      } finally {
        setLoading(false);
      }
    };

    if (spaceId && userId) {
      fetchMembers();
    }
  }, [spaceId, userId, skipFetching]);

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setMemberForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle notify member toggle
  const handleNotifyToggle = () => {
    setMemberForm((prev) => ({ ...prev, notifyMember: !prev.notifyMember }));

    // Call notification function when toggled on
    if (!memberForm.notifyMember) {
      handleMemberNotification();
    }
  };

  // Placeholder function for member notification
  const handleMemberNotification = () => {
    // TODO: Implement member notification logic
    console.log("Member notification would be sent here");
    showInfo("Notification settings updated for member");
    // This function will handle:
    // - Email notifications
    // - In-app notifications
    // - Welcome messages
    // - Space invitation details
  };

  // Handle add member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (
      !memberForm.email.trim() ||
      !memberForm.password.trim() ||
      !memberForm.adminPassword.trim()
    )
      return;

    setAddingMember(true);
    setSkipFetching(true); // Prevent members fetching during addition

    // Notify parent that member addition is starting
    if (onMemberAddingStart) {
      onMemberAddingStart();
    }

    try {
      console.log("Starting member addition process...");

      const newMember = await addMemberToSpace(
        spaceId,
        {
          ...memberForm,
          adminPassword: memberForm.adminPassword,
        },
        userId
      );

      // Member added successfully and admin session is preserved
      setMembers((prev) => [...prev, { ...newMember, isAdmin: false }]);
      setShowAddMemberModal(false);
      setMemberForm({
        email: "",
        password: "",
        username: "",
        adminPassword: "",
        notifyMember: true,
      });

      console.log("Member added successfully and admin session preserved");
      showSuccess(`Member "${memberForm.email}" added successfully`);

      // Trigger parent component refresh to update authentication state
      if (onMemberAdded) {
        onMemberAdded();
      }

      // Re-fetch members list to ensure consistency after a longer delay
      setTimeout(async () => {
        try {
          console.log("Refreshing members list...");
          const updatedMembers = await getSpaceMembers(spaceId, userId);
          setMembers(updatedMembers);
          console.log("Members list refreshed successfully");
        } catch (err) {
          console.error("Error refreshing members list:", err);
          showError("Member added but failed to refresh list. Please refresh the page manually.");
        }
      }, 1000); // Increased delay to ensure authentication is stable
    } catch (err) {
      console.error("Error adding member:", err);
      
      // If the error suggests authentication issues, provide specific guidance
      if (err.message.includes("restore admin session")) {
        showError("Member may have been added but admin session was interrupted. Please refresh the page to continue.");
      } else {
        showError(`Failed to add member: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setAddingMember(false);
      // Re-enable members fetching after a short delay to ensure auth state is settled
      setTimeout(() => {
        setSkipFetching(false);
      }, 1000);
      // Notify parent that member addition is complete
      if (onMemberAddingEnd) {
        onMemberAddingEnd();
      }
    }
  };

  // Handle remove member
  const handleRemoveMember = async (memberId) => {
    const memberToRemove = members.find(member => member.uid === memberId);
    const memberName = memberToRemove?.username || memberToRemove?.email || "this member";
    
    setConfirmDialog({
      isOpen: true,
      title: "Remove Member",
      message: `Are you sure you want to remove "${memberName}" from this space? They will lose access to all tasks and data in this space.`,
      onConfirm: async () => {
        try {
          await removeMemberFromSpace(spaceId, memberId, userId);
          setMembers((prev) => prev.filter((member) => member.uid !== memberId));
          showSuccess(`Member "${memberName}" removed successfully`);
        } catch (err) {
          console.error("Error removing member:", err);
          showError("Failed to remove member");
        }
      },
      memberInfo: memberToRemove
    });
  };

  // Close modal
  const handleCloseModal = () => {
    setShowAddMemberModal(false);
    setMemberForm({
      email: "",
      password: "",
      username: "",
      adminPassword: "",
      notifyMember: true,
    });
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authentication State Warning */}
      {!authStateStable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-yellow-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-yellow-800 text-sm">
              Authentication state is unstable. If you experience issues, please
              refresh the page.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Team Members
          </h2>
          <p className="text-gray-600 mt-1">
            Manage space members and their access
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
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
            Add Member
          </button>
        )}
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <div
            key={member.uid}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
          >
            {/* Member Avatar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {member.username?.charAt(0)?.toUpperCase() ||
                  member.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {member.username || member.email.split("@")[0]}
                </h3>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  member.isAdmin
                    ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                    : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200"
                }`}
              >
                {member.isAdmin ? "Admin" : "Member"}
              </span>

              {/* Remove Button (only for admin and not self) */}
              {isAdmin && !member.isAdmin && (
                <button
                  onClick={() => handleRemoveMember(member.uid)}
                  className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove member"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Member Since */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Member since{" "}
                {member.createdAt?.toDate()?.toLocaleDateString() || "N/A"}
              </p>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {members.length === 0 && (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600">No members found</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Add New Member
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={memberForm.email}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="member@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={memberForm.password}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username (Optional)
                </label>
                <input
                  type="text"
                  name="username"
                  value={memberForm.username}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white/50 backdrop-blur-sm"
                  placeholder="Display name"
                />
              </div>

              {/* Admin Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Admin Password *
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  value={memberForm.adminPassword}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-red-50/50 backdrop-blur-sm"
                  required
                  placeholder="Enter your admin password to confirm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required to maintain your admin session while creating the new
                  user
                </p>
              </div>

              {/* Notify Member Toggle */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-lg p-2">
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
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Notify Member
                      </h4>
                      <p className="text-sm text-gray-600">
                        Send welcome email with space invitation
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={handleNotifyToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      memberForm.notifyMember ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        memberForm.notifyMember
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-2 ml-12">
                  {memberForm.notifyMember
                    ? "✓ Member will receive a welcome email"
                    : "Member will not be notified"}
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-medium flex items-center gap-2 hover:scale-105 disabled:hover:scale-100"
                >
                  {addingMember && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  Add Member
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
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default MembersManagement;
