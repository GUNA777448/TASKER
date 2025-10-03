// Firebase collections creation and management

import { db } from "../firebase.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

// Create a new space
export const createSpace = async (user, formData) => {
  try {
    // Create a space for user
    const spaceRef = doc(collection(db, "spaces"));
    await setDoc(spaceRef, {
      id: spaceRef.id,
      adminId: user.uid,
      name: formData.name.trim(),
      description: formData.description.trim(),
      members: [user.uid], // Array of member IDs
      memberCount: 1,
      tasks: 0,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      updatedAt: serverTimestamp(),
      isActive: true,
    });

    // Update user's spaces array to include this new space
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        spaces: arrayUnion(spaceRef.id),
      });
    }

    return {
      id: spaceRef.id,
      name: formData.name.trim(),
      description: formData.description.trim(),
      members: 1,
      tasks: 0,
      adminId: user.uid,
    };
  } catch (error) {
    console.error("Error creating space:", error);
    throw new Error("Failed to create space");
  }
};

// Get all spaces for a user (as admin or member)
export const getUserSpaces = async (userId) => {
  try {
    const spacesQuery = query(
      collection(db, "spaces"),
      where("members", "array-contains", userId)
    );

    const querySnapshot = await getDocs(spacesQuery);
    const spaces = [];

    querySnapshot.forEach((doc) => {
      spaces.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return spaces;
  } catch (error) {
    console.error("Error fetching user spaces:", error);
    throw new Error("Failed to fetch spaces");
  }
};

// Get spaces where user is admin
export const getAdminSpaces = async (userId) => {
  try {
    const spacesQuery = query(
      collection(db, "spaces"),
      where("adminId", "==", userId)
    );

    const querySnapshot = await getDocs(spacesQuery);
    const spaces = [];

    querySnapshot.forEach((doc) => {
      spaces.push({
        id: doc.id,
        ...doc.data(),
        members: doc.data().memberCount || doc.data().members?.length || 1,
      });
    });

    return spaces;
  } catch (error) {
    console.error("Error fetching admin spaces:", error);
    throw new Error("Failed to fetch admin spaces");
  }
};

// Get individual space by ID
export const getSpaceById = async (spaceId, userId) => {
  try {
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);

    if (!spaceDoc.exists()) {
      throw new Error("Space not found");
    }

    const spaceData = spaceDoc.data();

    // Admin always has access to their space
    if (spaceData.adminId === userId) {
      return {
        id: spaceDoc.id,
        ...spaceData,
        members: spaceData.memberCount || spaceData.members?.length || 1,
      };
    }

    // Check if user is a member
    const isMember = spaceData.members?.some((member) =>
      typeof member === "string" ? member === userId : member.uid === userId
    );

    if (!isMember) {
      throw new Error("Access denied to this space");
    }

    return {
      id: spaceDoc.id,
      ...spaceData,
      members: spaceData.memberCount || spaceData.members?.length || 1,
    };
  } catch (error) {
    console.error("Error fetching space:", error);
    throw error;
  }
};

// Get tasks for a specific space
export const getSpaceTasks = async (spaceId) => {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("spaceId", "==", spaceId)
    );

    const querySnapshot = await getDocs(tasksQuery);
    const tasks = [];

    querySnapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return tasks;
  } catch (error) {
    console.error("Error fetching space tasks:", error);
    throw new Error("Failed to fetch tasks");
  }
};

// Create a new task in a space
export const createTask = async (spaceId, taskData, userId) => {
  try {
    const taskRef = doc(collection(db, "tasks"));
    await setDoc(taskRef, {
      id: taskRef.id,
      spaceId: spaceId,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || "",
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      assignee: taskData.assignee || "",
      dueDate: taskData.dueDate || null,
      tags: taskData.tags || [],
      progress: taskData.progress || 0,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
    });

    // Update task count in space
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);
    if (spaceDoc.exists()) {
      await updateDoc(spaceRef, {
        tasks: (spaceDoc.data().tasks || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      id: taskRef.id,
      spaceId: spaceId,
      ...taskData,
      progress: taskData.progress || 0,
      createdBy: userId,
    };
  } catch (error) {
    console.error("Error creating task:", error);
    throw new Error("Failed to create task");
  }
};

// Update task status
export const updateTaskStatus = async (taskId, status) => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      status: status,
      progress:
        status === "completed" ? 100 : status === "in-progress" ? 50 : 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    throw new Error("Failed to update task status");
  }
};

// Delete a task
export const deleteTask = async (taskId, spaceId) => {
  try {
    await deleteDoc(doc(db, "tasks", taskId));

    // Update task count in space
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);
    if (spaceDoc.exists()) {
      await updateDoc(spaceRef, {
        tasks: Math.max(0, (spaceDoc.data().tasks || 1) - 1),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    throw new Error("Failed to delete task");
  }
};

// Add member to space with user creation
export const addMemberToSpace = async (spaceId, memberData, adminUserId) => {
  try {
    // Check if admin has permission to add members
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);

    if (!spaceDoc.exists()) {
      throw new Error("Space not found");
    }

    const spaceData = spaceDoc.data();
    if (spaceData.adminId !== adminUserId) {
      throw new Error("Only space admin can add members");
    }

    // Store current admin user details to restore session
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Admin must be logged in to add members");
    }
    const adminEmail = currentUser.email;
    const adminUid = currentUser.uid;

    console.log("Current admin:", { email: adminEmail, uid: adminUid });

    try {
      // Create user account (this will automatically sign in the new user)
      console.log("Creating new user account for:", memberData.email);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        memberData.email,
        memberData.password
      );

      const newUser = userCredential.user;
      console.log("New user created:", newUser.uid);

      // Store new user info before signing out
      const newUserData = {
        uid: newUser.uid,
        email: memberData.email,
        username: memberData.username || memberData.email.split("@")[0],
      };

      // Create user profile in Firestore
      const userRef = doc(db, "users", newUserData.uid);
      await setDoc(userRef, {
        uid: newUserData.uid,
        email: newUserData.email,
        username: newUserData.username,
        role: "user",
        spaces: [spaceId],
        createdAt: serverTimestamp(),
        isActive: true,
      });

      // Add user to space members array
      await updateDoc(spaceRef, {
        members: arrayUnion(newUserData.uid),
        memberCount:
          (spaceData.memberCount || spaceData.members?.length || 1) + 1,
        updatedAt: serverTimestamp(),
      });

      // Sign out the newly created user and immediately re-authenticate admin
      console.log("Signing out newly created user:", newUser.uid);
      await auth.signOut();
      console.log("Signed out successfully");

      // Wait a moment to ensure sign out is complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Immediately re-authenticate the admin
      console.log("Re-authenticating admin:", adminEmail);
      try {
        const adminCredential = await signInWithEmailAndPassword(
          auth,
          adminEmail,
          memberData.adminPassword
        );
        console.log(
          "Admin re-authenticated successfully:",
          adminCredential.user.uid
        );

        // Wait a moment to ensure sign in is complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Verify that the admin is actually logged back in
        const verifyUser = auth.currentUser;
        if (!verifyUser || verifyUser.uid !== adminUserId) {
          console.error("Admin session verification failed:", {
            currentUser: verifyUser?.uid,
            expectedUser: adminUserId,
          });
          throw new Error(
            "Failed to verify admin session restoration. Please refresh the page."
          );
        }

        console.log("Admin session successfully verified:", verifyUser.uid);
      } catch (reAuthError) {
        console.error("Failed to re-authenticate admin:", reAuthError);
        throw new Error(
          "Failed to restore admin session. Please refresh the page and try again."
        );
      }

      return {
        ...newUserData,
        role: "user",
        adminEmail: adminEmail,
        requiresAdminReauth: false, // No longer needed since we handle it here
      };
    } catch (userCreationError) {
      // If there's an error during user creation, make sure admin stays logged in
      console.error("Error during user creation:", userCreationError);
      throw userCreationError;
    }
  } catch (error) {
    console.error("Error adding member:", error);
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Email is already registered");
    }
    if (error.code === "auth/weak-password") {
      throw new Error("Password should be at least 6 characters");
    }
    if (error.code === "auth/invalid-email") {
      throw new Error("Invalid email address");
    }
    throw new Error("Failed to add member");
  }
};

// Get space members with details
export const getSpaceMembers = async (spaceId, userId) => {
  try {
    // Check if user has access to this space
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);

    if (!spaceDoc.exists()) {
      throw new Error("Space not found");
    }

    const spaceData = spaceDoc.data();

    // Admin always has access, otherwise check if user is a member
    const isMember = spaceData.members?.some((member) =>
      typeof member === "string" ? member === userId : member.uid === userId
    );

    if (spaceData.adminId !== userId && !isMember) {
      throw new Error("Access denied to space members");
    }

    const members = [];

    // Get member details
    for (const member of spaceData.members || []) {
      const memberId = typeof member === "string" ? member : member.uid;
      const memberRef = doc(db, "users", memberId);
      const memberDoc = await getDoc(memberRef);

      if (memberDoc.exists()) {
        const memberData = memberDoc.data();
        members.push({
          uid: memberId,
          email: memberData.email,
          username: memberData.username,
          role: memberData.role,
          createdAt: memberData.createdAt,
          isAdmin: memberId === spaceData.adminId,
        });
      }
    }

    return members;
  } catch (error) {
    console.error("Error fetching space members:", error);
    throw error;
  }
};

// Remove member from space
export const removeMemberFromSpace = async (spaceId, memberId, adminUserId) => {
  try {
    // Check admin permissions
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);

    if (!spaceDoc.exists()) {
      throw new Error("Space not found");
    }

    const spaceData = spaceDoc.data();
    if (spaceData.adminId !== adminUserId) {
      throw new Error("Only space admin can remove members");
    }

    if (memberId === adminUserId) {
      throw new Error("Admin cannot remove themselves");
    }

    // Remove member from space
    await updateDoc(spaceRef, {
      members: arrayRemove(memberId),
      memberCount: Math.max(
        1,
        (spaceData.memberCount || spaceData.members?.length || 1) - 1
      ),
      updatedAt: serverTimestamp(),
    });

    // Update user's spaces array
    const userRef = doc(db, "users", memberId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        spaces: arrayRemove(spaceId),
      });
    }

    return true;
  } catch (error) {
    console.error("Error removing member:", error);
    throw error;
  }
};

// Utility function to sync user's spaces array with their actual spaces
export const syncUserSpaces = async (userId) => {
  try {
    console.log("Starting syncUserSpaces for userId:", userId);

    // Get all spaces where user is admin or member
    const allSpacesQuery = query(collection(db, "spaces"));
    const allSpacesSnapshot = await getDocs(allSpacesQuery);
    const userSpaces = [];
    const adminSpaces = [];
    const memberSpaces = [];
    const allSpacesData = [];

    allSpacesSnapshot.forEach((doc) => {
      const spaceData = doc.data();
      allSpacesData.push({
        id: doc.id,
        adminId: spaceData.adminId,
        members: spaceData.members,
        name: spaceData.name,
      });

      if (spaceData.adminId === userId) {
        userSpaces.push(doc.id);
        adminSpaces.push(doc.id);
        console.log(`User is admin of space: ${doc.id} (${spaceData.name})`);

        // Ensure admin is in the members array of their own space
        if (!spaceData.members?.includes(userId)) {
          console.log(`Adding admin ${userId} to members of space ${doc.id}`);
          updateDoc(doc.ref, {
            members: arrayUnion(userId),
            memberCount: (spaceData.members?.length || 0) + 1,
          });
        }
      } else if (spaceData.members?.includes(userId)) {
        userSpaces.push(doc.id);
        memberSpaces.push(doc.id);
        console.log(`User is member of space: ${doc.id} (${spaceData.name})`);
      }
    });

    console.log("Sync analysis:", {
      userId,
      totalSpacesFound: allSpacesData.length,
      adminSpaces,
      memberSpaces,
      finalUserSpaces: userSpaces,
      allSpacesData,
    });

    // Update user's spaces array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      spaces: userSpaces,
    });

    console.log("User spaces synced successfully:", {
      userId,
      totalSpaces: userSpaces,
      adminSpaces: adminSpaces,
    });
    return userSpaces;
  } catch (error) {
    console.error("Error syncing user spaces:", error);
    throw error;
  }
};

// Get space notes
export const getSpaceNotes = async (spaceId, userId) => {
  try {
    // Check if user has access to this space
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);

    if (!spaceDoc.exists()) {
      throw new Error("Space not found");
    }

    const spaceData = spaceDoc.data();

    // Check if user is admin or member
    const isAdmin = spaceData.adminId === userId;
    const isMember = spaceData.members?.some((member) =>
      typeof member === "string" ? member === userId : member.uid === userId
    );

    if (!isAdmin && !isMember) {
      throw new Error("Access denied: You are not a member of this space");
    }

    // Return notes or empty string if none exist
    return spaceData.notes || "";
  } catch (error) {
    console.error("Error getting space notes:", error);
    throw error;
  }
};

// Update space notes
export const updateSpaceNotes = async (spaceId, notes, userId) => {
  try {
    // Check if user has access to this space
    const spaceRef = doc(db, "spaces", spaceId);
    const spaceDoc = await getDoc(spaceRef);

    if (!spaceDoc.exists()) {
      throw new Error("Space not found");
    }

    const spaceData = spaceDoc.data();

    // Check if user is admin or member
    const isAdmin = spaceData.adminId === userId;
    const isMember = spaceData.members?.some((member) =>
      typeof member === "string" ? member === userId : member.uid === userId
    );

    if (!isAdmin && !isMember) {
      throw new Error("Access denied: You are not a member of this space");
    }

    // Update notes with timestamp and user info
    await updateDoc(spaceRef, {
      notes: notes,
      notesUpdatedAt: serverTimestamp(),
      notesUpdatedBy: userId,
      updatedAt: serverTimestamp(),
    });

    console.log("Space notes updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating space notes:", error);
    throw error;
  }
};

// Listen to space notes changes in real-time
export const subscribeToSpaceNotes = (spaceId, callback) => {
  const spaceRef = doc(db, "spaces", spaceId);

  return onSnapshot(
    spaceRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback(data.notes || "");
      }
    },
    (error) => {
      console.error("Error listening to space notes:", error);
    }
  );
};
